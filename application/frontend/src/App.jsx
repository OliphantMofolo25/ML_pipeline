import { useCallback, useEffect, useState } from "react";
import "./App.css";
import depressionImage from "./assets/Depression.jpg";
import diabetesImage from "./assets/Diabetes.jpg";
import highBloodImage from "./assets/High blood.jpg";
import depressionImage1 from "./assets/depression_pic.jpeg";
import diabetesImage_1 from "./assets/diabetesi.jpeg";
import highbloodImage_1 from "./assets/Bloodpressure.jpg";
// Import illustration images
import depressionIllus from "./assets/Illustrations/depression.jpg";
import diabetesIllus from "./assets/Illustrations/diabete.jpg";
import highBloodIllus from "./assets/Illustrations/highblood.jpg";

const BASE_URL = "http://localhost:8000";

const API = {
  stats: () => `${BASE_URL}/api/stats`,
  reviews: (page = 1, condition = "", search = "", sort = "rating_desc") =>
    `${BASE_URL}/api/reviews?page=${page}&condition=${encodeURIComponent(condition)}&search=${encodeURIComponent(search)}&sort=${sort}`,
  submitReview: () => `${BASE_URL}/api/reviews`,
  predict: () => `${BASE_URL}/api/predict`,
  recommend: () => `${BASE_URL}/api/recommend`,
};

const CONDITIONS = {
  Depression: {
    accent: "#818cf8",
    glow: "rgba(129, 140, 248, 0.35)",
    tint: "rgba(129, 140, 248, 0.10)",
    text: "#3730a3",
    cardBg: "#f0f4ff",
    cardBorder: "#c7d2fe",
    cardHoverBorder: "#6366f1",
    cardHoverShadow: "rgba(99, 102, 241, 0.18)",
    dotColor: "#818cf8",
    symptomAccent: "#4338ca",
    illustration: depressionIllus,
  },
  "High Blood Pressure": {
    accent: "#fb923c",
    glow: "rgba(251, 146, 60, 0.34)",
    tint: "rgba(251, 146, 60, 0.10)",
    text: "#92400e",
    cardBg: "#fffbf0",
    cardBorder: "#fed7aa",
    cardHoverBorder: "#d97706",
    cardHoverShadow: "rgba(217, 119, 6, 0.18)",
    dotColor: "#f59e0b",
    symptomAccent: "#b45309",
    illustration: highBloodIllus,
  },
  "Type 2 Diabetes": {
    accent: "#34d399",
    glow: "rgba(52, 211, 153, 0.34)",
    tint: "rgba(52, 211, 153, 0.10)",
    text: "#065f46",
    cardBg: "#f0fdf8",
    cardBorder: "#a7f3d0",
    cardHoverBorder: "#059669",
    cardHoverShadow: "rgba(5, 150, 105, 0.18)",
    dotColor: "#10b981",
    symptomAccent: "#047857",
    illustration: diabetesIllus,
  },
};

const CONDITION_SYMPTOMS = {
  Depression: [
    "Persistent sadness or low mood most of the day",
    "Loss of interest in activities once enjoyed",
    "Changes in appetite or significant weight change",
    "Difficulty sleeping or sleeping too much",
    "Fatigue and loss of energy nearly every day",
    "Feelings of worthlessness or excessive guilt",
    "Difficulty concentrating or making decisions",
  ],
  "High Blood Pressure": [
    "Often symptom-free — regular monitoring is essential",
    "Persistent headaches, especially in the morning",
    "Dizziness or lightheadedness",
    "Shortness of breath or chest tightness",
    "Nosebleeds in severe or prolonged cases",
    "Blurred or double vision episodes",
    "Facial flushing or pounding in the ears",
  ],
  "Type 2 Diabetes": [
    "Increased thirst and frequent urination",
    "Unexplained fatigue or lack of energy",
    "Blurred vision or frequent vision changes",
    "Slow-healing cuts, bruises, or sores",
    "Numbness or tingling in hands and feet",
    "Frequent infections (skin, gum, or bladder)",
    "Unexplained weight loss despite eating normally",
  ],
};

const CONDITION_ICONS = {
  Depression: "🧠",
  "High Blood Pressure": "❤️",
  "Type 2 Diabetes": "🩺",
};

const NEUTRAL = {
  accent: "#89a6c6",
  glow: "rgba(137, 166, 198, 0.28)",
  tint: "rgba(137, 166, 198, 0.14)",
  text: "#eef6ff",
};

const NAV = [
  { id: "dashboard", label: "Dashboard" },
  { id: "overview", label: "Overview" },
  { id: "reviews", label: "Reviews" },
  { id: "predict", label: "Predictor" },
];

// Hero panel slideshow uses the first 3 images
const HERO_SLIDES = [
  { image: depressionImage, label: "Depression" },
  { image: diabetesImage, label: "Type 2 Diabetes" },
  { image: highBloodImage, label: "High Blood Pressure" },
];

// Ribbon banner uses the next 3 images
const RIBBON_SLIDES = [
  { image: depressionImage1, label: "Depression" },
  { image: diabetesImage_1, label: "Type 2 Diabetes" },
  { image: highbloodImage_1, label: "High Blood Pressure" },
];

function getConditionMeta(condition) {
  return CONDITIONS[condition] || NEUTRAL;
}

function formatNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toLocaleString() : "—";
}

function formatDecimal(value, digits = 1) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(digits) : "—";
}

function formatPercent(value, digits = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `${parsed.toFixed(digits)}%` : "—";
}

function clamp(value, min = 0, max = 100) {
  return Math.min(Math.max(value, min), max);
}

function polarToCartesian(angle, radius) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: 80 + radius * Math.cos(radians),
    y: 80 + radius * Math.sin(radians),
  };
}

function arcPath(percent, radius = 68) {
  const p = clamp(percent);
  if (p <= 0) return "";
  const start = polarToCartesian(0, radius);
  const end = polarToCartesian((p / 100) * 360, radius);
  const largeArcFlag = p > 50 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Server returned ${response.status}`);
      const json = await response.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  return { data, loading, error, reload: load };
}

// ─── Image Ribbon (uses RIBBON_SLIDES) ─────────────────────────────────────────
function ImageRibbon() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % RIBBON_SLIDES.length), 3800);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="ribbon-section">
      {RIBBON_SLIDES.map((slide, i) => (
        <img
          key={i}
          className={`ribbon-img${i === idx ? " ribbon-img-active" : ""}`}
          src={slide.image}
          alt={slide.label}
        />
      ))}
      <div className="ribbon-overlay" />
      <div className="ribbon-label">
        {RIBBON_SLIDES.map((slide, i) => (
          <span key={i} className={`ribbon-pill${i === idx ? " ribbon-pill-active" : ""}`}>
            {slide.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Hero Slideshow (uses HERO_SLIDES) ────────────────────────────────────────
function HeroSlideshow() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setActiveIndex((i) => (i + 1) % HERO_SLIDES.length);
    }, 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="hero-slideshow">
      {HERO_SLIDES.map((slide, i) => (
        <div key={i} className={`hero-slide${i === activeIndex ? " hero-slide-active" : ""}`}>
          <img src={slide.image} alt={slide.label} className="hero-slide-image" />
          <div className="hero-slide-caption">{slide.label}</div>
        </div>
      ))}
      <div className="hero-slide-dots">
        {HERO_SLIDES.map((_, i) => (
          <span key={i} className={`hero-dot${i === activeIndex ? " hero-dot-active" : ""}`} />
        ))}
      </div>
    </div>
  );
}

// ─── Shell & Layout ───────────────────────────────────────────────────────────
function AppShell({ children }) {
  return <div className="app-shell">{children}</div>;
}

function Panel({ children, className = "", glow = false }) {
  return (
    <section className={`panel ${glow ? "panel-glow" : ""} ${className}`.trim()}>
      {children}
    </section>
  );
}

function SectionTitle({ eyebrow, title, subtitle, action }) {
  return (
    <div className="section-title">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2>{title}</h2>
        {subtitle ? <p className="section-subtitle">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

function StatusPill({ children, warm = false }) {
  return (
    <span className={`status-pill ${warm ? "status-pill-warm" : ""}`}>{children}</span>
  );
}

function LoadingState({ label = "Loading..." }) {
  return (
    <div className="state-card">
      <div className="spinner" />
      <p>{label}</p>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="state-card state-card-error">
      <p>{message}</p>
      {onRetry ? (
        <button className="ghost-button" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="state-card">
      <p>{message}</p>
    </div>
  );
}

// ─── Condition Cards ──────────────────────────────────────────────────────────
function ConditionCards() {
  return (
    <div className="stats-grid">
      {Object.entries(CONDITIONS).map(([name, meta]) => {
        const symptoms = CONDITION_SYMPTOMS[name] || [];
        const icon = CONDITION_ICONS[name];
        return (
          <div
            key={name}
            className="condition-info-card"
            style={{
              "--card-bg": meta.cardBg,
              "--card-border": meta.cardBorder,
              "--card-hover-border": meta.cardHoverBorder,
              "--card-hover-shadow": meta.cardHoverShadow,
              "--card-dot": meta.dotColor,
              "--card-symptom-accent": meta.symptomAccent,
            }}
          >
            <div className="cic-icon">{icon}</div>
            <h3 className="cic-title">{name}</h3>
            <p className="cic-desc">
              {name === "Depression" &&
                "A common mental health condition affecting mood, thoughts, and daily functioning."}
              {name === "High Blood Pressure" &&
                "Consistently elevated blood pressure that silently strains the heart and arteries over time."}
              {name === "Type 2 Diabetes" &&
                "A chronic condition where the body does not use insulin properly, leading to high blood sugar."}
            </p>
            <p className="cic-symptom-label">Common symptoms</p>
            <ul className="cic-symptom-list">
              {symptoms.map((s, i) => (
                <li key={i}>
                  <span className="cic-dot" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

// ─── Review Submission ────────────────────────────────────────────────────────
function ReviewSubmissionSection({ onSubmitted }) {
  const [form, setForm] = useState({
    drug: "",
    condition: "Depression",
    rating: "8",
    usefulCount: "0",
    review: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    if (error) setError(null);
    if (success) setSuccess(null);
  }

  async function submitReview() {
    setError(null);
    setSuccess(null);
    if (!form.drug.trim() || !form.review.trim()) {
      setError("Please enter a drug name and a detailed review.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(API.submitReview(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drug: form.drug.trim(),
          condition: form.condition,
          rating: Number(form.rating),
          usefulCount: Number(form.usefulCount || 0),
          review: form.review.trim(),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.detail || payload.message || `Submission failed (${response.status})`);
      }
      setSuccess("Review saved successfully.");
      setForm({ drug: "", condition: "Depression", rating: "8", usefulCount: "0", review: "" });
      if (onSubmitted) onSubmitted();
    } catch (err) {
      setError(err.message || "Unable to save review right now.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel glow>
      <SectionTitle
        eyebrow="Share Your Experience"
        title="Add a patient review"
        subtitle="Your review helps improve condition insights and drug recommendations."
      />
      <div className="review-form-grid">
        <input
          className="control"
          type="text"
          value={form.drug}
          placeholder="Drug name"
          onChange={(e) => updateField("drug", e.target.value)}
        />
        <select
          className="control"
          value={form.condition}
          onChange={(e) => updateField("condition", e.target.value)}
        >
          {Object.keys(CONDITIONS).map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input
          className="control"
          type="number"
          min="1"
          max="10"
          step="0.1"
          value={form.rating}
          onChange={(e) => updateField("rating", e.target.value)}
          placeholder="Rating (1–10)"
        />
        <input
          className="control"
          type="number"
          min="0"
          step="1"
          value={form.usefulCount}
          onChange={(e) => updateField("usefulCount", e.target.value)}
          placeholder="Helpful votes"
        />
      </div>
      <textarea
        className="textarea review-form-textarea"
        value={form.review}
        onChange={(e) => updateField("review", e.target.value)}
        placeholder="Describe the patient's experience with this drug — include effectiveness, side effects, and duration of use."
        rows={5}
      />
      {error ? <ErrorState message={error} /> : null}
      {success ? (
        <Panel className="submission-success-panel">
          <p>{success}</p>
        </Panel>
      ) : null}
      <div className="review-form-actions">
        <button className="primary-button" disabled={saving} onClick={submitReview}>
          {saving ? "Saving…" : "Save Review"}
        </button>
        <p className="review-form-note">
          Please select the correct condition — this ensures accurate data for future analysis.
        </p>
      </div>
    </Panel>
  );
}

// ─── Shared UI Atoms ──────────────────────────────────────────────────────────
function StatTile({ label, value, note, warm = false }) {
  return (
    <Panel className={`stat-tile ${warm ? "stat-tile-warm" : ""}`}>
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      {note ? <p className="stat-note">{note}</p> : null}
    </Panel>
  );
}

function ConditionBadge({ label }) {
  const meta = getConditionMeta(label);
  return (
    <span className="condition-badge" style={{ "--badge-accent": meta.accent, "--badge-bg": meta.tint }}>
      <span className="condition-dot" />
      {label}
    </span>
  );
}

function RingGauge({ label, value, note, percent, accent = "#53d0ff" }) {
  const stroke = arcPath(percent);
  return (
    <div className="ring-gauge" style={{ "--ring-accent": accent }}>
      <svg viewBox="0 0 160 160" className="ring-svg" aria-hidden="true">
        <circle cx="80" cy="80" r="68" className="ring-track" />
        {stroke ? <path d={stroke} className="ring-progress" /> : null}
        <circle cx="80" cy="80" r="49" className="ring-core" />
      </svg>
      <div className="ring-content">
        <p className="ring-label">{label}</p>
        <p className="ring-value">{value}</p>
        {note ? <p className="ring-note">{note}</p> : null}
      </div>
    </div>
  );
}

function DistributionBars({ items = [] }) {
  const maxCount = Math.max(...items.map((item) => Number(item.count) || 0), 1);
  return (
    <div className="distribution-list">
      {items.map((item) => {
        const score = Number(item.star) || 0;
        const width = ((Number(item.count) || 0) / maxCount) * 100;
        const tone = score >= 8 ? "#34d399" : score >= 5 ? "#fb923c" : "#f87171";
        return (
          <div className="distribution-row" key={item.star}>
            <span className="distribution-key">{item.star}</span>
            <div className="distribution-track">
              <span className="distribution-fill" style={{ width: `${width}%`, background: tone }} />
            </div>
            <span className="distribution-value">{formatNumber(item.count)}</span>
          </div>
        );
      })}
    </div>
  );
}

function ConditionSplit({ items = [] }) {
  return (
    <div className="condition-grid">
      {items.map((item) => {
        const meta = getConditionMeta(item.condition);
        return (
          <Panel key={item.condition} className="condition-card" glow>
            <div className="condition-card-top">
              <ConditionBadge label={item.condition} />
              <StatusPill warm>{formatPercent(item.pct)}</StatusPill>
            </div>
            <p className="condition-count">{formatNumber(item.count)}</p>
            <p className="condition-copy">Average rating {formatDecimal(item.avgRating)}</p>
            <div className="condition-bar">
              <span style={{ width: `${clamp(item.pct)}%`, background: meta.accent, boxShadow: `0 0 18px ${meta.glow}` }} />
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

// ─── Predictor Page with Illustrations and Symptom Suggestions ────────────────
function PredictorPage() {
  const [symptoms, setSymptoms] = useState("");
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [error, setError] = useState(null);
  const [validationError, setValidationError] = useState(null);

  // Symptom suggestions data
  const symptomSuggestions = {
    "General": ["fever", "fatigue", "headache", "dizziness", "nausea", "weight loss", "weight gain", "loss of appetite"],
    "Depression": ["sadness", "anxiety", "insomnia", "loss of interest", "low energy", "hopelessness", "irritability", "social withdrawal"],
    "Diabetes": ["increased thirst", "frequent urination", "blurred vision", "slow healing", "numbness in feet", "dry mouth", "excessive hunger", "yeast infections"],
    "Blood Pressure": ["chest pain", "shortness of breath", "nosebleeds", "facial flushing", "vision changes", "heart palpitations", "confusion", "ringing in ears"]
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
    if (msg) { setValidationError(msg); return; }
    setLoading(true);
    try {
      const predRes = await fetch(API.predict(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms }),
      });
      if (!predRes.ok) throw new Error(`Prediction failed (${predRes.status})`);
      const predJson = await predRes.json();
      if (!predJson || !predJson.condition) throw new Error("The model returned an unrecognisable response. Please try again.");
      setPrediction(predJson);
      try {
        const recRes = await fetch(API.recommend(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ condition: predJson.condition }),
        });
        if (!recRes.ok) throw new Error(`Recommendation failed (${recRes.status})`);
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

  const meta = prediction ? getConditionMeta(prediction.condition) : NEUTRAL;

  return (
    <div className="page-stack">
      <SectionTitle
        eyebrow="AI Health Assistant"
        title="Condition predictor"
        subtitle="Describe patient symptoms to receive an AI-powered condition assessment and medication guidance."
      />
      
      {/* Row 1: Symptom Description + Illustration side by side */}
      <div className="predict-row">
        <Panel glow className="predict-description-panel">
          <label className="input-label" htmlFor="symptoms">Patient symptoms description</label>
          <textarea
            id="symptoms"
            className="textarea"
            value={symptoms}
            onChange={handleSymptomChange}
            placeholder="Describe the patient's presentation in plain English — e.g. 'persistent sadness, loss of appetite and trouble sleeping for the past two weeks'…"
            rows={5}
          />
          {validationError && <ErrorState message={validationError} />}
          {error && <ErrorState message={error} />}
          <button className="primary-button full-width" disabled={loading || !symptoms.trim()} onClick={runPrediction}>
            {loading ? "Analysing…" : "Predict Condition"}
          </button>
        </Panel>
        
        <div className="predict-illustration-compact">
          {prediction ? (
            <div className="illustration-compact" style={{ borderColor: meta.accent }}>
              <img 
                src={meta.illustration} 
                alt={prediction.condition} 
                className="illustration-compact-image"
              />
              <div className="illustration-compact-label" style={{ background: meta.accent }}>
                {prediction.condition}
              </div>
            </div>
          ) : (
            <div className="illustration-compact-placeholder">
              <div className="placeholder-icon">🩺</div>
              <p>Prediction result will appear here</p>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Symptom suggestions chips - side by side with description area */}
      <div className="suggestions-row">
        <div className="suggestions-container">
          <p className="suggestions-title">Quick symptom suggestions:</p>
          <div className="suggestions-chips-wrapper">
            {Object.entries(symptomSuggestions).map(([category, symptomsList]) => (
              <div key={category} className="suggestion-category-group">
                <span className="category-label-mini">{category}</span>
                <div className="suggestion-chips-mini">
                  {symptomsList.map((symptom) => (
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
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Results - Predicted Condition with Confidence + Treatment Guidance in 4x4 grid */}
      <div className="results-grid-2col">
        {prediction ? (
          <Panel className="prediction-compact-card" glow>
            <p className="eyebrow">Predicted Condition</p>
            <div className="prediction-compact-content">
              <div className="prediction-info">
                <h3 style={{ color: meta.text }}>{prediction.condition}</h3>
                {prediction.confidence && (
                  <div className="confidence-badge" style={{ background: meta.tint, color: meta.text }}>
                    Confidence: {formatPercent(prediction.confidence)}
                  </div>
                )}
                {prediction.clinicalBasis && <p className="prediction-copy-small">{prediction.clinicalBasis}</p>}
                {prediction.summary && <p className="prediction-summary-small">{prediction.summary}</p>}
              </div>
              <div className="confidence-ring-small">
                <RingGauge
                  label=""
                  value={formatPercent(prediction.confidence)}
                  note=""
                  percent={Number(prediction.confidence) || 0}
                  accent={meta.accent}
                />
              </div>
            </div>
          </Panel>
        ) : (
          !loading && !validationError && !error && (
            <div className="prediction-placeholder-small">
              <EmptyState message="Prediction results will appear here after analysis." />
            </div>
          )
        )}

        {recommendations && (
          <Panel glow className="treatment-grid-panel">
            <SectionTitle eyebrow="Treatment Guidance" title="Suggested medications" />
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
          </Panel>
        )}
      </div>
    </div>
  );
}

// ─── Pages ────────────────────────────────────────────────────────────────────
function HeroDashboard({ onNav }) {
  return (
    <Panel className="hero-panel" glow>
      <div className="hero-copy">
        <p className="eyebrow">Proactive Healthcare</p>
        <h1>Villa Smart LifeGuard Analytics</h1>
        <p className="hero-subtitle">
          Empowering early prediction of diabetes, hypertension, and mental health risks — so care begins before conditions progress.
        </p>
        <div className="hero-actions">
          <button className="primary-button" onClick={() => onNav("predict")}>
            Run Prediction
          </button>
          <button className="ghost-button" onClick={() => onNav("reviews")}>
            Explore Reviews
          </button>
        </div>
      </div>
      <div className="hero-visual">
        <HeroSlideshow />
      </div>
    </Panel>
  );
}

function DashboardPage({ onNav }) {
  const { data, loading, error, reload } = useFetch(API.stats());

  return (
    <div className="page-stack">
      <HeroDashboard onNav={onNav} />

      {error ? (
        <Panel className="api-status-panel">
          <div>
            <p className="eyebrow">System Status</p>
            <h3>Live statistics are temporarily unavailable</h3>
            <p className="section-subtitle">
              Please try again shortly. The rest of the application remains fully available.
            </p>
          </div>
          <div className="api-status-actions">
            <StatusPill warm>Reconnecting…</StatusPill>
            <button className="ghost-button" onClick={reload}>
              Retry
            </button>
          </div>
        </Panel>
      ) : null}

      <div className="section-pad">
        <p className="eyebrow" style={{ marginBottom: 4 }}>Conditions Monitored</p>
        <h2 className="section-heading">Understanding your health risks</h2>
      </div>
      <ConditionCards />

      <ImageRibbon />

      {!loading && !error && data ? (
        <div className="dashboard-grid">
          <Panel glow>
            <SectionTitle
              eyebrow="Condition Overview"
              title="Reviews by condition"
              subtitle="Distribution across monitored health conditions."
            />
            <ConditionSplit items={data.byCondition || []} />
          </Panel>
          <Panel glow>
            <SectionTitle
              eyebrow="Rating Breakdown"
              title="Patient satisfaction scores"
              subtitle="How patients rated their treatment experience."
            />
            {(data.ratingDistribution || []).length ? (
              <DistributionBars items={data.ratingDistribution} />
            ) : (
              <EmptyState message="No rating data available yet." />
            )}
          </Panel>
        </div>
      ) : null}

      {loading && !error ? <LoadingState label="Loading health statistics…" /> : null}
    </div>
  );
}

function OverviewPage() {
  const { data, loading, error, reload } = useFetch(API.stats());

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Statistics are temporarily unavailable." onRetry={reload} />;
  if (!data) return <EmptyState message="No data available." />;

  return (
    <div className="page-stack">
      <SectionTitle
        eyebrow="At a Glance"
        title="Dataset overview"
        subtitle={`${formatNumber(data.totalReviews)} patient reviews available.`}
      />
      <div className="stats-grid-small">
        <StatTile label="Total Reviews" value={formatNumber(data.totalReviews)} note="Full dataset" />
        <StatTile label="Average Rating" value={formatDecimal(data.avgRating, 2)} note="Patient satisfaction" warm />
        <StatTile label="Unique Drugs" value={formatNumber(data.uniqueDrugs)} note="Medications tracked" />
        <StatTile label="Helpful Votes" value={formatNumber(data.totalUsefulVotes)} note="Community feedback" />
      </div>
      <div className="dashboard-grid">
        <Panel glow>
          <SectionTitle eyebrow="Population Split" title="Reviews by condition" />
          <ConditionSplit items={data.byCondition || []} />
        </Panel>
        <Panel glow>
          <SectionTitle eyebrow="Rating Spectrum" title="Ratings from 1 to 10" />
          {(data.ratingDistribution || []).length ? (
            <DistributionBars items={data.ratingDistribution} />
          ) : (
            <EmptyState message="No rating data available." />
          )}
        </Panel>
      </div>
      <Panel glow>
        <SectionTitle
          eyebrow="Top Performers"
          title="Highest rated medications"
          subtitle="Ranked by average patient rating across all reviews."
        />
        {(data.topDrugs || []).length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Drug</th>
                  <th>Condition</th>
                  <th>Reviews</th>
                  <th>Avg Rating</th>
                  <th>Helpful Votes</th>
                </tr>
              </thead>
              <tbody>
                {data.topDrugs.map((row, index) => (
                  <tr key={`${row.drug}-${index}`}>
                    <td className="cell-strong">{row.drug}</td>
                    <td><ConditionBadge label={row.condition} /></td>
                    <td>{formatNumber(row.reviews)}</td>
                    <td>{formatDecimal(row.avgRating, 1)}</td>
                    <td>{formatDecimal(row.avgUsefulVotes, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="No medication data available." />
        )}
      </Panel>
    </div>
  );
}

function ReviewsPage() {
  const [filterCond, setFilterCond] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("rating_desc");
  const [page, setPage] = useState(1);

  const { data, loading, error, reload } = useFetch(API.reviews(page, filterCond, search, sort));

  function applySearch() {
    setSearch(searchInput);
    setPage(1);
  }

  function handleReviewSubmitted() {
    reload();
    setPage(1);
  }

  return (
    <div className="page-stack">
      <SectionTitle
        eyebrow="Patient Voices"
        title="Drug review explorer"
        subtitle="Search and filter patient experiences to find the most relevant reviews."
      />
      <ReviewSubmissionSection onSubmitted={handleReviewSubmitted} />
      <Panel className="filter-panel" glow>
        <input
          className="control"
          type="text"
          value={searchInput}
          placeholder="Search by drug name or review content…"
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applySearch()}
        />
        <select className="control" value={filterCond} onChange={(e) => { setFilterCond(e.target.value); setPage(1); }}>
          <option value="">All Conditions</option>
          {Object.keys(CONDITIONS).map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select className="control" value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}>
          <option value="rating_desc">Rating: High to Low</option>
          <option value="rating_asc">Rating: Low to High</option>
          <option value="useful_desc">Most Helpful</option>
          <option value="date_desc">Newest First</option>
        </select>
        <button className="primary-button" onClick={applySearch}>
          Search
        </button>
      </Panel>

      {loading ? <LoadingState label="Loading reviews…" /> : null}
      {error ? <ErrorState message="Reviews are temporarily unavailable." onRetry={reload} /> : null}

      {!loading && !error && data ? (
        <>
          {(data.reviews || []).length ? (
            <div className="reviews-list">
              {data.reviews.map((review, index) => {
                const meta = getConditionMeta(review.condition);
                return (
                  <Panel className="review-card" glow key={`${review.drug}-${index}`}>
                    <div className="review-head">
                      <div>
                        <p className="review-drug">{review.drug}</p>
                        <ConditionBadge label={review.condition} />
                      </div>
                      <div className="review-score" style={{ "--score-accent": meta.accent }}>
                        <span>{formatDecimal(review.rating, 1)}</span>
                        <small>/ 10</small>
                      </div>
                    </div>
                    <p className="review-body">{review.review}</p>
                    <div className="review-meta">
                      <span>{review.date || "Date unavailable"}</span>
                      <span>{formatNumber(review.usefulCount)} found this helpful</span>
                    </div>
                  </Panel>
                );
              })}
            </div>
          ) : (
            <EmptyState message="No reviews matched your filters." />
          )}
          {data.pages > 1 ? (
            <div className="pagination">
              <button className="ghost-button" disabled={page === 1} onClick={() => setPage((v) => Math.max(1, v - 1))}>
                Previous
              </button>
              <span className="pagination-label">{page} / {data.pages}</span>
              <button className="ghost-button" disabled={page === data.pages} onClick={() => setPage((v) => Math.min(data.pages, v + 1))}>
                Next
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("dashboard");

  return (
    <AppShell>
      <header className="topbar">
        <div className="brand-block">
          <button className="brand-button" onClick={() => setPage("dashboard")}>
            <span className="brand-mark" />
            <div>
              <strong>Villa Private Hospital</strong>
              <span>Empowering proactive healthcare</span>
            </div>
          </button>
        </div>
        <nav className="nav-pills">
          {NAV.map((item) => (
            <button
              key={item.id}
              className={`nav-pill ${page === item.id ? "nav-pill-active" : ""}`}
              onClick={() => setPage(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="main-shell">
        {page === "dashboard" ? <DashboardPage onNav={setPage} /> : null}
        {page === "overview" ? <OverviewPage /> : null}
        {page === "reviews" ? <ReviewsPage /> : null}
        {page === "predict" ? <PredictorPage /> : null}
      </main>

      <footer className="footer">
        <span>Villa Private Hospital · Smart LifeGuard Analytics</span>
        <span>© 2026 All rights reserved</span>
      </footer>
    </AppShell>
  );
}