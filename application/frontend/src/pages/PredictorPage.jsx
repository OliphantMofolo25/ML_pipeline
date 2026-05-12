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
  const trimmed = text.trim().toLowerCase();

  if (!trimmed) {
    return "Please describe the patient's symptoms before running a prediction.";
  }

  if (/^\d+$/.test(trimmed)) {
    return "Numbers alone are not valid. Please describe symptoms in words.";
  }

  if (/^[^a-z\s]+$/i.test(trimmed)) {
    return "Special characters alone are not valid input.";
  }

  if (!/[a-z]/i.test(trimmed)) {
    return "Please use real words to describe symptoms.";
  }

  if (trimmed.length < 8) {
    return "Please provide a slightly more detailed description.";
  }

  const words = trimmed.split(/\s+/).filter(Boolean);

  if (words.length < 2) {
    return "Please include at least a couple of words describing symptoms.";
  }

  const vowelCount = (trimmed.match(/[aeiou]/gi) || []).length;
  const vowelRatio = vowelCount / trimmed.length;

  if (vowelRatio < 0.15) {
    return "Input seems unclear or not meaningful. Please describe symptoms more clearly.";
  }

  if (/(.)\1{5,}/.test(trimmed)) {
    return "Too many repeated characters. Please enter real symptoms.";
  }

  const mashPatterns = ["asdf", "qwerty", "zxcv"];
  if (mashPatterns.some(p => trimmed.includes(p))) {
    return "Input appears to be random text. Please describe symptoms properly.";
  }

const healthKeywords = [

  "pain","fever","cough","fatigue","headache","nausea","vomiting",
  "dizziness","weakness","tired","low","sick","unwell","ache","burning","swelling",
  "chills","sweating","night sweats","cold","hot","shivering",

  "anxiety","depression","sad","sadness","hopeless","hopelessness",
  "worthless","empty","mood","low mood","irritable","irritability",
  "crying","tearful","loss of interest","no interest","lack of interest",
  "no motivation","loss of motivation","fatigue","low energy",
  "sleep","insomnia","oversleeping","sleeping too much",
  "trouble sleeping","restless","stress","stressed","panic",
  "panic attack","nervous","worry","overthinking",
  "concentration","focus","memory problems","brain fog",
  "social withdrawal","isolated","lonely","guilt","suicidal thoughts",

  "thirst","excessive thirst","very thirsty","dry","dry mouth",
  "urination","frequent urination","peeing often","urinating often",
  "hunger","hungry","always hungry","increased appetite",
  "blurred vision","vision problems","blurry",
  "fatigue","tired","low energy",
  "slow healing","cuts not healing","wounds not healing",
  "infections","frequent infections","yeast infection",
  "itching","skin itching","dry skin",
  "numbness","tingling","numb feet","tingling hands",
  "weight loss","unexpected weight loss",
  "dark skin","dark patches","acanthosis",
  "burning feet","foot pain",

  "pressure","high pressure","blood pressure","hypertension",
  "headache","severe headache","morning headache",
  "chest pain","tight chest","chest tightness",
  "shortness of breath","breathless","difficulty breathing",
  "nosebleeds","bleeding nose",
  "vision changes","blurred vision","double vision",
  "dizziness","lightheaded","faint","fainting",
  "heart palpitations","palpitations","fast heartbeat",
  "irregular heartbeat","pounding heart",
  "fatigue","confusion","ringing in ears","tinnitus",
  "face flushing","red face","sweating",
];

  let score = 0;

  words.forEach(word => {
    if (healthKeywords.some(k => word.includes(k))) {
      score += 1;
    }
  });

  if (score === 0) {
    return "Your input is a bit unclear. Try describing physical or emotional symptoms for better accuracy.";
  }

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

      const predPayload = await predRes.json();

      if (!predRes.ok) {
        throw new Error(predPayload.detail || predPayload.message || `Prediction failed (${predRes.status})`);
      }

      const predJson = predPayload;
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
        subtitle="This screening model only predicts among Depression, High Blood Pressure, and Type 2 Diabetes. It is not a general diagnosis engine."
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
              <p className="predictor-note">
                Best results come from real symptom descriptions with duration or severity. Random text, unsupported topics, or vague phrases will now be rejected instead of forced into a prediction.
              </p>
              {validationError && <ErrorState message={validationError} />}
              {error && <ErrorState message={error} />}
              <button className="primary-button full-width" disabled={loading || !symptoms.trim()} onClick={runPrediction}>
                {loading ? "Analysing..." : "Predict Condition"}
              </button>
            </Panel>

            <Panel glow className="suggestions-container">
              <p className="suggestions-title">Supported prediction scope</p>

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
