import { useState } from "react";
import { API, clamp, formatPercent, getConditionMeta, NEUTRAL } from "../shared/appCore";
import { EmptyState, ErrorState, LoadingState, Panel, SectionTitle, StatusPill } from "../shared/AppShared";

export default function PredictorPage() {
  const [symptoms, setSymptoms] = useState("");
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [error, setError] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [selectedCondition, setSelectedCondition] = useState("Depression");

  const generalSymptoms = [
    "fever",
    "fatigue",
    "headache",
    "dizziness",
    "nausea",
    "weight loss",
    "weight gain",
    "loss of appetite",
  ];

  const symptomSuggestions = {
    Depression: ["sadness", "anxiety", "insomnia", "loss of interest", "low energy", "hopelessness", "irritability", "social withdrawal"],
    "High Blood Pressure": ["chest pain", "shortness of breath", "nosebleeds", "facial flushing", "vision changes", "heart palpitations", "confusion", "ringing in ears"],
    "Type 2 Diabetes": ["increased thirst", "frequent urination", "blurred vision", "slow healing", "numbness in feet", "dry mouth", "excessive hunger", "yeast infections"],
  };

  function addSymptom(symptom) {
    const currentSymptoms = symptoms.trim();
    if (currentSymptoms === "") {
      setSymptoms(symptom);
    } else {
      setSymptoms(currentSymptoms + ", " + symptom);
    }
  }

  function validateInput(text) {
    const trimmed = text.trim();
    if (!trimmed) return "Please describe the patient's symptoms before running a prediction.";
    if (trimmed.length < 10) return "Input is too short. Please provide a more detailed description.";
    return null;
  }

  async function runPrediction() {
    setValidationError(null);
    setError(null);
    setPrediction(null);
    setRecommendations(null);

    const msg = validateInput(symptoms);
    if (msg) {
      setValidationError(msg);
      setShowResults(false);
      return;
    }

    setShowResults(true);
    setLoading(true);

    try {
      const predRes = await fetch(API.predict(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms }),
      });

      if (!predRes.ok) {
        throw new Error(`Prediction failed (${predRes.status})`);
      }

      const predJson = await predRes.json();
      if (!predJson || !predJson.condition) {
        throw new Error("The model returned an unrecognisable response. Please try again.");
      }

      setPrediction(predJson);

      try {
        const recRes = await fetch(API.recommend(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ condition: predJson.condition }),
        });

        if (!recRes.ok) {
          throw new Error(`Recommendation failed (${recRes.status})`);
        }

        setRecommendations(await recRes.json());
      } catch {
        setRecommendations({ drugs: [], disclaimer: "Drug recommendations are temporarily unavailable." });
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleSymptomChange(e) {
    setSymptoms(e.target.value);
    if (validationError) setValidationError(null);
  }

  function resetPredictionView() {
    setShowResults(false);
    setLoading(false);
    setPrediction(null);
    setRecommendations(null);
    setError(null);
    setValidationError(null);
  }

  const meta = prediction ? getConditionMeta(prediction.condition) : NEUTRAL;

  return (
    <div className="page-stack">
      <SectionTitle
        eyebrow="AI Health Assistant"
        title="Condition predictor"
        subtitle="Describe patient symptoms to receive an AI-powered condition assessment and medication guidance."
      />

      {!showResults ? (
        <>
          <div className="predict-row">
            <Panel glow className="predict-description-panel">
              <label className="input-label" htmlFor="symptoms">Patient symptoms description</label>
              <textarea
                id="symptoms"
                className="textarea"
                value={symptoms}
                onChange={handleSymptomChange}
                placeholder="Describe the patient's presentation in plain English - e.g. 'persistent sadness, loss of appetite and trouble sleeping for the past two weeks'..."
                rows={5}
              />
              {validationError && <ErrorState message={validationError} />}
              {error && <ErrorState message={error} />}
              <button className="primary-button full-width" disabled={loading || !symptoms.trim()} onClick={runPrediction}>
                {loading ? "Analysing..." : "Predict Condition"}
              </button>
            </Panel>

            <Panel glow className="suggestions-container">
              <p className="suggestions-title">Quick symptom guide</p>

              <div className="quick-symptom-section">
                <p className="quick-symptom-heading">General symptoms</p>
                <div className="suggestion-chips-mini">
                  {generalSymptoms.map((symptom) => (
                    <button
                      key={symptom}
                      className="symptom-chip-mini"
                      onClick={() => addSymptom(symptom)}
                    >
                      {symptom}
                    </button>
                  ))}
                </div>
              </div>

              <div className="quick-symptom-section">
                <p className="quick-symptom-heading">Condition groups</p>
                <div className="condition-button-row">
                  {Object.keys(symptomSuggestions).map((condition) => (
                    <button
                      key={condition}
                      className={`condition-select-button ${selectedCondition === condition ? "condition-select-button-active" : ""}`.trim()}
                      onClick={() => setSelectedCondition(condition)}
                    >
                      {condition}
                    </button>
                  ))}
                </div>
              </div>

              <div className="quick-symptom-section">
                <p className="quick-symptom-heading">{selectedCondition} symptoms</p>
                <div className="suggestion-chips-mini">
                  {(symptomSuggestions[selectedCondition] || []).map((symptom) => (
                    <button
                      key={`${selectedCondition}-${symptom}`}
                      className="symptom-chip-mini"
                      onClick={() => addSymptom(symptom)}
                    >
                      {symptom}
                    </button>
                  ))}
                </div>
              </div>
            </Panel>
          </div>
        </>
      ) : (
        <div className="predict-results-stack">
          <div className="predict-results-toolbar">
            <button className="ghost-button predictor-reset-button" onClick={resetPredictionView}>
              Predict Another Case
            </button>
          </div>

          {loading ? (
            <Panel className="prediction-loading-panel" glow>
              <LoadingState label="Analysing symptoms and preparing treatment guidance..." />
            </Panel>
          ) : (
            <div className="results-grid-2col">
              {prediction ? (
                <Panel className="prediction-compact-card prediction-spotlight-card" glow>
                  <SectionTitle
                    eyebrow="Predicted Condition"
                    title={prediction.condition}
                    subtitle="AI-generated assessment based on the symptoms you provided."
                    action={
                      prediction.confidence ? (
                        <div className="confidence-badge confidence-badge-prominent" style={{ background: meta.tint, color: meta.text }}>
                          Confidence: {formatPercent(prediction.confidence)}
                        </div>
                      ) : null
                    }
                  />

                  <div className="prediction-hero">
                    <div className="prediction-hero-copy">
                      {prediction.clinicalBasis && <p className="prediction-copy-small">{prediction.clinicalBasis}</p>}
                      {prediction.summary && <p className="prediction-summary-small">{prediction.summary}</p>}
                    </div>
                    <div className="prediction-hero-visual" style={{ "--prediction-accent": meta.accent }}>
                      <img
                        src={meta.illustration}
                        alt={prediction.condition}
                        className="prediction-hero-image"
                      />
                      <div className="prediction-hero-label">{prediction.condition}</div>
                    </div>
                  </div>

                  <div className="prediction-compact-content">


                  </div>
                </Panel>
              ) : (
                <Panel className="prediction-compact-card" glow>
                  {error ? (
                    <ErrorState message={error} />
                  ) : (
                    <EmptyState message="Prediction results will appear here after analysis." />
                  )}
                </Panel>
              )}

              <Panel glow className="treatment-grid-panel treatment-spotlight-panel">
                <SectionTitle
                  eyebrow="Treatment Guidance"
                  title="Suggested medications"
                  subtitle="Recommended options related to the predicted condition."
                />
                {recommendations ? (
                  <>
                    <div className="medications-grid-4x4">
                      {(recommendations.drugs || []).slice(0, 8).map((drug, index) => (
                        <div className="medication-card-small" key={`${drug.name}-${index}`}>
                          <div className="medication-header">
                            <p className="medication-name">{drug.name}</p>
                            {drug.effectiveness !== undefined && (
                              <StatusPill warm>{formatPercent(drug.effectiveness)}</StatusPill>
                            )}
                          </div>
                          {drug.class && <p className="medication-class">{drug.class}</p>}
                          {drug.effectiveness !== undefined && (
                            <div className="effectiveness-bar">
                              <span style={{ width: `${clamp(drug.effectiveness)}%` }} />
                            </div>
                          )}
                          {drug.sideEffects && (
                            <p className="medication-side-effects"><strong>Side effects:</strong> {drug.sideEffects.substring(0, 60)}...</p>
                          )}
                        </div>
                      ))}
                    </div>
                    {(recommendations.drugs || []).length === 0 && (
                      <EmptyState message="No medication suggestions available." />
                    )}
                    {recommendations.disclaimer && (
                      <p className="disclaimer-small">{recommendations.disclaimer}</p>
                    )}
                  </>
                ) : error ? (
                  <EmptyState message="Treatment guidance could not be loaded for this prediction." />
                ) : (
                  <EmptyState message="Treatment guidance will appear with the prediction result." />
                )}
              </Panel>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
