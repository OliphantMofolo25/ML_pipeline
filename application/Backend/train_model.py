from __future__ import annotations

from datetime import datetime, UTC
from pathlib import Path

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline


BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parents[1]
TRAIN_DATASET_PATH = PROJECT_ROOT / "cleaned_drugsComTrain.csv"
TEST_DATASET_PATH = PROJECT_ROOT / "cleaned_drugsComTest.csv"
PIPELINE_PATH = BASE_DIR / "pipeline.joblib"
SUPPORTED_RAW_CONDITIONS = ["Depression", "High Blood Pressure", "Diabetes, Type 2"]


def main() -> None:
    missing_files = [path for path in (TRAIN_DATASET_PATH, TEST_DATASET_PATH) if not path.exists()]
    if missing_files:
        raise FileNotFoundError(f"Dataset file(s) not found: {', '.join(str(path) for path in missing_files)}")

    dataframe = pd.concat(
        [
            pd.read_csv(path, usecols=["condition", "review"])
            for path in (TRAIN_DATASET_PATH, TEST_DATASET_PATH)
        ],
        ignore_index=True,
    )
    dataframe = dataframe[dataframe["condition"].isin(SUPPORTED_RAW_CONDITIONS)].copy()
    dataframe = dataframe.dropna(subset=["condition", "review"])
    dataframe["review"] = dataframe["review"].astype(str).str.strip()
    dataframe = dataframe[dataframe["review"] != ""]

    x_train, x_test, y_train, y_test = train_test_split(
        dataframe["review"],
        dataframe["condition"],
        test_size=0.2,
        random_state=42,
        stratify=dataframe["condition"],
    )

    pipeline = Pipeline(
        [
            (
                "tfidf",
                TfidfVectorizer(
                    max_features=5000,
                    ngram_range=(1, 2),
                    stop_words="english",
                    min_df=2,
                ),
            ),
            (
                "model",
                LogisticRegression(
                    max_iter=1200,
                    class_weight="balanced",
                    random_state=42,
                ),
            ),
        ]
    )

    pipeline.fit(x_train, y_train)
    predictions = pipeline.predict(x_test)
    accuracy = accuracy_score(y_test, predictions)
    report = classification_report(y_test, predictions)

    bundle = {
        "pipeline": pipeline,
        "metadata": {
            "trainedAtUtc": datetime.now(UTC).isoformat(),
            "datasetPaths": [str(TRAIN_DATASET_PATH), str(TEST_DATASET_PATH)],
            "targetConditions": SUPPORTED_RAW_CONDITIONS,
            "trainingRows": int(len(x_train)),
            "testRows": int(len(x_test)),
            "accuracy": round(float(accuracy), 4),
            "samplesPerCondition": dataframe["condition"].value_counts().to_dict(),
            "classificationReport": report,
        },
    }
    joblib.dump(bundle, PIPELINE_PATH)

    print(f"Training rows: {len(x_train)}")
    print(f"Test rows: {len(x_test)}")
    print(f"Accuracy: {accuracy:.4f}")
    print(report)
    print(f"Saved backend pipeline to {PIPELINE_PATH}")


if __name__ == "__main__":
    main()
