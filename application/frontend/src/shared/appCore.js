import { useCallback, useEffect, useState } from "react";
import depressionImage from "../assets/Depression.jpg";
import diabetesImage from "../assets/Diabetes.jpg";
import highBloodImage from "../assets/High blood.jpg";
import depressionImage1 from "../assets/depression_pic.jpeg";
import diabetesImage_1 from "../assets/diabetesi.jpeg";
import highbloodImage_1 from "../assets/Bloodpressure.jpg";
import depressionIllus from "../assets/Illustrations/depression.jpg";
import diabetesIllus from "../assets/Illustrations/diabete.jpg";
import highBloodIllus from "../assets/Illustrations/highblood.jpg";

// ─── Exported so components can build ad-hoc API URLs ─────────────────────────
export const BASE_URL = "http://localhost:8000";

export const API = {
  stats: () => `${BASE_URL}/api/stats`,
  reviews: (page = 1, condition = "", search = "", sort = "rating_desc") =>
    `${BASE_URL}/api/reviews?page=${page}&condition=${encodeURIComponent(condition)}&search=${encodeURIComponent(search)}&sort=${sort}`,
  submitReview: () => `${BASE_URL}/api/reviews`,
  predict: () => `${BASE_URL}/api/predict`,
  recommend: () => `${BASE_URL}/api/recommend`,
};

export const CONDITIONS = {
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

export const CONDITION_SYMPTOMS = {
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

export const CONDITION_ICONS = {
  Depression: "🧠",
  "High Blood Pressure": "❤️",
  "Type 2 Diabetes": "🩺",
};

export const NEUTRAL = {
  accent: "#89a6c6",
  glow: "rgba(137, 166, 198, 0.28)",
  tint: "rgba(137, 166, 198, 0.14)",
  text: "#eef6ff",
};

export const NAV = [
  { id: "dashboard", label: "Dashboard" },
  { id: "overview", label: "Overview" },
  { id: "reviews", label: "Reviews" },
  { id: "predict", label: "Predictor" },
];

export const HERO_SLIDES = [
  { image: depressionImage, label: "Depression" },
  { image: diabetesImage, label: "Type 2 Diabetes" },
  { image: highBloodImage, label: "High Blood Pressure" },
];

export const RIBBON_SLIDES = [
  { image: depressionImage1, label: "Depression" },
  { image: diabetesImage_1, label: "Type 2 Diabetes" },
  { image: highbloodImage_1, label: "High Blood Pressure" },
];

export function getConditionMeta(condition) {
  return CONDITIONS[condition] || NEUTRAL;
}

export function formatNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toLocaleString() : "—";
}

export function formatDecimal(value, digits = 1) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(digits) : "—";
}

export function formatPercent(value, digits = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `${parsed.toFixed(digits)}%` : "—";
}

export function clamp(value, min = 0, max = 100) {
  return Math.min(Math.max(value, min), max);
}

function polarToCartesian(angle, radius) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: 80 + radius * Math.cos(radians),
    y: 80 + radius * Math.sin(radians),
  };
}

export function arcPath(percent, radius = 68) {
  const p = clamp(percent);
  if (p <= 0) return "";
  const start = polarToCartesian(0, radius);
  const end = polarToCartesian((p / 100) * 360, radius);
  const largeArcFlag = p > 50 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

export function useFetch(url) {
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