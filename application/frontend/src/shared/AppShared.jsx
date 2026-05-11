import { useEffect, useState } from "react";
import {
  API,
  arcPath,
  clamp,
  CONDITIONS,
  CONDITION_ICONS,
  CONDITION_SYMPTOMS,
  formatDecimal,
  formatNumber,
  formatPercent,
  getConditionMeta,
  HERO_SLIDES,
  RIBBON_SLIDES,
} from "./appCore";

export function ImageRibbon() {
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

export function HeroSlideshow() {
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

export function AppShell({ children }) {
  return <div className="app-shell">{children}</div>;
}

export function Panel({ children, className = "", glow = false }) {
  return (
    <section className={`panel ${glow ? "panel-glow" : ""} ${className}`.trim()}>
      {children}
    </section>
  );
}

export function SectionTitle({ eyebrow, title, subtitle, action }) {
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

export function StatusPill({ children, warm = false }) {
  return (
    <span className={`status-pill ${warm ? "status-pill-warm" : ""}`}>{children}</span>
  );
}

export function LoadingState({ label = "Loading..." }) {
  return (
    <div className="state-card">
      <div className="spinner" />
      <p>{label}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
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

export function EmptyState({ message }) {
  return (
    <div className="state-card">
      <p>{message}</p>
    </div>
  );
}

export function ConditionCards() {
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

export function ReviewSubmissionSection({ onSubmitted }) {
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
          placeholder="Rating (1-10)"
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
        placeholder="Describe the patient's experience with this drug - include effectiveness, side effects, and duration of use."
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
          {saving ? "Saving..." : "Save Review"}
        </button>
        <p className="review-form-note">
          Please select the correct condition - this ensures accurate data for future analysis.
        </p>
      </div>
    </Panel>
  );
}

export function StatTile({ label, value, note, warm = false }) {
  return (
    <Panel className={`stat-tile ${warm ? "stat-tile-warm" : ""}`}>
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      {note ? <p className="stat-note">{note}</p> : null}
    </Panel>
  );
}

export function ConditionBadge({ label }) {
  const meta = getConditionMeta(label);
  return (
    <span className="condition-badge" style={{ "--badge-accent": meta.accent, "--badge-bg": meta.tint }}>
      <span className="condition-dot" />
      {label}
    </span>
  );
}

export function RingGauge({ label, value, note, percent, accent = "#53d0ff" }) {
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

export function DistributionBars({ items = [] }) {
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

export function ConditionSplit({ items = [] }) {
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
