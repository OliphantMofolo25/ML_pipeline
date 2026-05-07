from __future__ import annotations

import math
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
import uvicorn
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parents[1]
TRAIN_DATASET_PATH = PROJECT_ROOT / "cleaned_drugsComTrain.csv"
TEST_DATASET_PATH = PROJECT_ROOT / "cleaned_drugsComTest.csv"
PIPELINE_PATH = BASE_DIR / "pipeline.joblib"

RAW_TO_UI_CONDITION = {
    "Depression": "Depression",
    "High Blood Pressure": "High Blood Pressure",
    "Diabetes, Type 2": "Type 2 Diabetes",
}
UI_TO_RAW_CONDITION = {value: key for key, value in RAW_TO_UI_CONDITION.items()}
SUPPORTED_RAW_CONDITIONS = set(RAW_TO_UI_CONDITION)
SIDE_EFFECT_KEYWORDS = [
    "nausea",
    "headache",
    "fatigue",
    "dizziness",
    "insomnia",
    "dry mouth",
    "weight gain",
    "weight loss",
    "diarrhea",
    "constipation",
    "rash",
    "anxiety",
    "sleep",
]


class PredictRequest(BaseModel):
    symptoms: str = Field(..., min_length=3)


class RecommendRequest(BaseModel):
    condition: str = Field(..., min_length=3)


app = FastAPI(
    title="MedInsight AI Backend",
    version="1.0.0",
    description="Python API for stats, reviews, condition prediction, and drug recommendations.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def normalize_condition_for_ui(condition: str) -> str:
    return RAW_TO_UI_CONDITION.get(condition, condition)


def normalize_condition_for_model(condition: str) -> str:
    return UI_TO_RAW_CONDITION.get(condition, condition)


def load_dataset() -> pd.DataFrame:
    missing_files = [path for path in (TRAIN_DATASET_PATH, TEST_DATASET_PATH) if not path.exists()]
    if missing_files:
        raise FileNotFoundError(f"Dataset file(s) not found: {', '.join(str(path) for path in missing_files)}")

    frames = [
        pd.read_csv(path, usecols=["drugName", "condition", "review", "rating", "date", "usefulCount"])
        for path in (TRAIN_DATASET_PATH, TEST_DATASET_PATH)
    ]
    dataframe = pd.concat(frames, ignore_index=True)
    dataframe = dataframe[dataframe["condition"].isin(SUPPORTED_RAW_CONDITIONS)].copy()
    dataframe = dataframe.dropna(subset=["drugName", "condition", "review"])
    dataframe["rating"] = pd.to_numeric(dataframe["rating"], errors="coerce")
    dataframe["usefulCount"] = pd.to_numeric(dataframe["usefulCount"], errors="coerce").fillna(0)
    dataframe["date"] = pd.to_datetime(dataframe["date"], errors="coerce")
    dataframe["condition_ui"] = dataframe["condition"].map(normalize_condition_for_ui)
    dataframe["review"] = dataframe["review"].astype(str).str.strip()
    dataframe["drugName"] = dataframe["drugName"].astype(str).str.strip()
    dataframe = dataframe[dataframe["rating"].notna()]
    return dataframe


def load_pipeline() -> dict[str, Any] | None:
    if not PIPELINE_PATH.exists() or PIPELINE_PATH.stat().st_size == 0:
        return None

    pipeline = joblib.load(PIPELINE_PATH)
    if not isinstance(pipeline, dict) or "pipeline" not in pipeline:
        raise ValueError("Backend pipeline artifact has an unexpected structure.")
    return pipeline


def build_drug_recommendations(dataframe: pd.DataFrame) -> dict[str, list[dict[str, Any]]]:
    recommendations: dict[str, list[dict[str, Any]]] = {}

    for raw_condition, group in dataframe.groupby("condition"):
        drugs: list[dict[str, Any]] = []
        for drug_name, drug_group in group.groupby("drugName"):
            reviews = int(len(drug_group))
            avg_rating = float(drug_group["rating"].mean())
            avg_useful = float(drug_group["usefulCount"].mean())
            keyword_hits: dict[str, int] = {}

            joined_reviews = " ".join(drug_group["review"].dropna().astype(str).str.lower().tolist())
            for keyword in SIDE_EFFECT_KEYWORDS:
                hits = joined_reviews.count(keyword)
                if hits:
                    keyword_hits[keyword] = hits

            side_effects = ", ".join(
                keyword for keyword, _ in sorted(keyword_hits.items(), key=lambda item: item[1], reverse=True)[:3]
            )

            drugs.append(
                {
                    "name": drug_name,
                    "class": None,
                    "effectiveness": round(max(min(avg_rating, 10), 0) * 10, 1),
                    "sideEffects": side_effects or None,
                    "notes": (
                        f"Based on {reviews} reviews with an average rating of {avg_rating:.1f}/10 "
                        f"and {avg_useful:.1f} helpful votes on average."
                    ),
                    "_reviews": reviews,
                    "_avg_rating": avg_rating,
                    "_avg_useful": avg_useful,
                }
            )

        drugs.sort(key=lambda item: (item["_avg_rating"], item["_reviews"], item["_avg_useful"]), reverse=True)
        recommendations[normalize_condition_for_ui(raw_condition)] = [
            {
                "name": item["name"],
                "class": item["class"],
                "effectiveness": item["effectiveness"],
                "sideEffects": item["sideEffects"],
                "notes": item["notes"],
            }
            for item in drugs[:5]
        ]

    return recommendations


def extract_basis_terms(text: str, pipeline_bundle: dict[str, Any]) -> list[str]:
    vectorizer = pipeline_bundle["pipeline"].named_steps["tfidf"]
    vocabulary = vectorizer.vocabulary_
    seen: list[str] = []
    for token in text.lower().split():
        cleaned = "".join(char for char in token if char.isalpha())
        if cleaned and cleaned in vocabulary and cleaned not in seen:
            seen.append(cleaned)
        if len(seen) == 3:
            break
    return seen


@app.on_event("startup")
def startup() -> None:
    dataset = load_dataset()
    pipeline = load_pipeline()
    app.state.dataset = dataset
    app.state.pipeline_bundle = pipeline
    app.state.recommendations = build_drug_recommendations(dataset)


@app.get("/health")
def health() -> dict[str, Any]:
    pipeline_ready = app.state.pipeline_bundle is not None
    return {
        "status": "ok",
        "datasetLoaded": True,
        "pipelineLoaded": pipeline_ready,
        "records": int(len(app.state.dataset)),
    }


@app.get("/api/stats")
def get_stats() -> dict[str, Any]:
    dataframe = app.state.dataset
    total_reviews = int(len(dataframe))
    avg_rating = float(dataframe["rating"].mean()) if total_reviews else 0.0
    unique_drugs = int(dataframe["drugName"].nunique())
    total_useful_votes = int(dataframe["usefulCount"].sum())

    by_condition = []
    for condition, group in dataframe.groupby("condition_ui"):
        count = int(len(group))
        by_condition.append(
            {
                "condition": condition,
                "count": count,
                "pct": round((count / total_reviews) * 100, 1) if total_reviews else 0,
                "avgRating": round(float(group["rating"].mean()), 2),
            }
        )
    by_condition.sort(key=lambda item: item["count"], reverse=True)

    rounded_ratings = dataframe["rating"].round().clip(1, 10).astype(int)
    distribution = rounded_ratings.value_counts().to_dict()
    rating_distribution = [{"star": star, "count": int(distribution.get(star, 0))} for star in range(1, 11)]

    drug_summary = (
        dataframe.groupby(["drugName", "condition_ui"], as_index=False)
        .agg(
            reviews=("review", "count"),
            avgRating=("rating", "mean"),
            avgUsefulVotes=("usefulCount", "mean"),
        )
    )
    drug_summary = drug_summary[drug_summary["reviews"] >= 3].sort_values(
        by=["avgRating", "reviews", "avgUsefulVotes"],
        ascending=[False, False, False],
    )
    top_drugs = [
        {
            "drug": row["drugName"],
            "condition": row["condition_ui"],
            "reviews": int(row["reviews"]),
            "avgRating": round(float(row["avgRating"]), 2),
            "avgUsefulVotes": round(float(row["avgUsefulVotes"]), 2),
        }
        for _, row in drug_summary.head(10).iterrows()
    ]

    return {
        "totalReviews": total_reviews,
        "avgRating": round(avg_rating, 2),
        "uniqueDrugs": unique_drugs,
        "totalUsefulVotes": total_useful_votes,
        "byCondition": by_condition,
        "ratingDistribution": rating_distribution,
        "topDrugs": top_drugs,
    }


@app.get("/api/reviews")
def get_reviews(
    page: int = Query(1, ge=1),
    condition: str = Query("", alias="condition"),
    search: str = Query(""),
    sort: str = Query("rating_desc"),
) -> dict[str, Any]:
    dataframe = app.state.dataset.copy()

    if condition:
        dataframe = dataframe[dataframe["condition_ui"] == condition]

    if search:
        mask = dataframe["drugName"].str.contains(search, case=False, na=False) | dataframe["review"].str.contains(
            search, case=False, na=False
        )
        dataframe = dataframe[mask]

    if sort == "rating_asc":
        dataframe = dataframe.sort_values(["rating", "usefulCount"], ascending=[True, False])
    elif sort == "useful_desc":
        dataframe = dataframe.sort_values(["usefulCount", "rating"], ascending=[False, False])
    elif sort == "date_desc":
        dataframe = dataframe.sort_values(["date", "usefulCount"], ascending=[False, False], na_position="last")
    else:
        dataframe = dataframe.sort_values(["rating", "usefulCount"], ascending=[False, False])

    total = int(len(dataframe))
    page_size = 12
    pages = max(1, math.ceil(total / page_size))
    current_page = min(page, pages)
    start = (current_page - 1) * page_size
    end = start + page_size

    records = dataframe.iloc[start:end]
    reviews = [
        {
            "drug": row["drugName"],
            "condition": row["condition_ui"],
            "review": row["review"],
            "rating": round(float(row["rating"]), 1),
            "date": row["date"].strftime("%Y-%m-%d") if pd.notna(row["date"]) else None,
            "usefulCount": int(row["usefulCount"]),
        }
        for _, row in records.iterrows()
    ]

    return {
        "reviews": reviews,
        "total": total,
        "page": current_page,
        "pages": pages,
    }


@app.post("/api/predict")
def predict_condition(payload: PredictRequest) -> dict[str, Any]:
    pipeline_bundle = app.state.pipeline_bundle
    if pipeline_bundle is None:
        raise HTTPException(
            status_code=503,
            detail="Prediction pipeline is missing. Run train_model.py to create pipeline.joblib.",
        )

    pipeline = pipeline_bundle["pipeline"]
    text = payload.symptoms.strip()
    prediction = pipeline.predict([text])[0]
    probabilities = pipeline.predict_proba([text])[0]
    confidence = round(float(probabilities.max()) * 100, 1)
    condition = normalize_condition_for_ui(str(prediction))
    basis_terms = extract_basis_terms(text, pipeline_bundle)

    if basis_terms:
        basis = f"The input shares strong review-language signals with terms such as {', '.join(basis_terms)}."
    else:
        basis = "The prediction is driven mainly by the overall review-language pattern learned from the training data."

    summary = (
        f"The model classifies this text as {condition} with {confidence:.1f}% confidence based on the symptom wording."
    )

    return {
        "condition": condition,
        "confidence": confidence,
        "clinicalBasis": basis,
        "summary": summary,
    }


@app.post("/api/recommend")
def recommend_drugs(payload: RecommendRequest) -> dict[str, Any]:
    ui_condition = payload.condition.strip()
    raw_condition = normalize_condition_for_model(ui_condition)
    normalized_ui = normalize_condition_for_ui(raw_condition)
    drugs = app.state.recommendations.get(normalized_ui, [])

    return {
        "drugs": drugs,
        "disclaimer": (
            "These recommendations are derived from historical drug-review patterns in the dataset and are not a "
            "replacement for professional medical judgement."
        ),
    }


if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
