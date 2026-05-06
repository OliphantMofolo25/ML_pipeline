import { useCallback, useEffect, useState } from "react";
import "./App.css";

const BASE_URL = "http://localhost:8000";

const API = {
  stats: () => `${BASE_URL}/api/stats`,
  reviews: (page = 1, condition = "", search = "", sort = "rating_desc") =>
    `${BASE_URL}/api/reviews?page=${page}&condition=${encodeURIComponent(condition)}&search=${encodeURIComponent(search)}&sort=${sort}`,
  predict: () => `${BASE_URL}/api/predict`,
  recommend: () => `${BASE_URL}/api/recommend`,
};

const CONDITIONS = {
  Depression: {
    accent: "#53d0ff",
    glow: "rgba(83, 208, 255, 0.35)",
    tint: "rgba(83, 208, 255, 0.16)",
    text: "#dff7ff",
  },
  "High Blood Pressure": {
    accent: "#ffb15c",
    glow: "rgba(255, 177, 92, 0.34)",
    tint: "rgba(255, 177, 92, 0.16)",
    text: "#fff1df",
  },
  "Type 2 Diabetes": {
    accent: "#7df7c5",
    glow: "rgba(125, 247, 197, 0.34)",
    tint: "rgba(125, 247, 197, 0.16)",
    text: "#e6fff5",
  },
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
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
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

function AppShell({ children }) {
  return <div className="app-shell">{children}</div>;
}

function Panel({ children, className = "", glow = false }) {
  return <section className={`panel ${glow ? "panel-glow" : ""} ${className}`.trim()}>{children}</section>;
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
  return <span className={`status-pill ${warm ? "status-pill-warm" : ""}`}>{children}</span>;
}

function LoadingState({ label = "Loading live data..." }) {
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
        const tone = score >= 8 ? "#7df7c5" : score >= 5 ? "#ffb15c" : "#ff6e88";
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
          <Panel
            key={item.condition}
            className="condition-card"
            glow
          >
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

function HeroDashboard({ stats, loading, error, onRetry, onNav }) {
  const totalReviews = stats ? formatNumber(stats.totalReviews) : "Live";
  const avgRating = stats ? formatDecimal(stats.avgRating, 2) : "—";
  const uniqueDrugs = stats ? formatNumber(stats.uniqueDrugs) : "—";
  const byCondition = stats?.byCondition || [];
  const topCondition = byCondition[0];
  const topConditionMeta = getConditionMeta(topCondition?.condition);
  const totalUsefulVotes = stats ? formatNumber(stats.totalUsefulVotes) : "—";

  return (
    <Panel className="hero-panel" glow>
      <div className="hero-copy">
        <p className="eyebrow">Intelligent Care Dashboard</p>
        <h1>Smart, warm insight for your drug review pipeline.</h1>
        <p className="hero-subtitle">
          A live operations view for condition distribution, review quality, and model-assisted recommendation flows.
          The styling follows your futuristic inspiration, but every metric only comes from your real API.
        </p>
        <div className="hero-actions">
          <button className="primary-button" onClick={() => onNav("predict")}>
            Run Prediction
          </button>
          <button className="ghost-button" onClick={() => onNav("reviews")}>
            Explore Reviews
          </button>
        </div>
        <div className="hero-chips">
          <StatusPill>Live API</StatusPill>
          <StatusPill warm>{uniqueDrugs} therapies tracked</StatusPill>
          <StatusPill>{totalUsefulVotes} helpful votes</StatusPill>
        </div>
      </div>

      <div className="hero-visual">
        {loading ? <LoadingState label="Connecting to live dashboard..." /> : null}
        {error ? <ErrorState message={`Unable to load dashboard stats: ${error}`} onRetry={onRetry} /> : null}
        {!loading && !error ? (
          <>
            <RingGauge
              label="Review Volume"
              value={totalReviews}
              note={`Avg rating ${avgRating} / 10`}
              percent={stats?.avgRating ? Number(stats.avgRating) * 10 : 0}
              accent="#53d0ff"
            />
            <div className="hero-orbits">
              {byCondition.slice(0, 3).map((item) => {
                const meta = getConditionMeta(item.condition);
                return (
                  <div
                    className="orbit-node"
                    key={item.condition}
                    style={{ "--orbit-accent": meta.accent, "--orbit-glow": meta.glow }}
                  >
                    <span className="orbit-value">{formatPercent(item.pct)}</span>
                    <span className="orbit-label">{item.condition}</span>
                  </div>
                );
              })}
            </div>
            <div className="hero-caption">
              <p>Primary signal</p>
              <strong style={{ color: topConditionMeta.accent }}>
                {topCondition?.condition || "Waiting for stats"}
              </strong>
            </div>
          </>
        ) : null}
      </div>
    </Panel>
  );
}

function DashboardPage({ onNav }) {
  const { data, loading, error, reload } = useFetch(API.stats());

  return (
    <div className="page-stack">
      <HeroDashboard stats={data} loading={loading} error={error} onRetry={reload} onNav={onNav} />

      {!loading && !error && data ? (
        <>
          <div className="stats-grid">
            <StatTile label="Total Reviews" value={formatNumber(data.totalReviews)} note="Patient responses collected" />
            <StatTile label="Average Rating" value={formatDecimal(data.avgRating, 2)} note="Overall satisfaction out of 10" warm />
            <StatTile label="Unique Drugs" value={formatNumber(data.uniqueDrugs)} note="Distinct therapies in the dataset" />
            <StatTile label="Useful Votes" value={formatNumber(data.totalUsefulVotes)} note="Community helpfulness signals" />
          </div>

          <div className="dashboard-grid">
            <Panel glow>
              <SectionTitle
                eyebrow="Condition Heat"
                title="Condition distribution"
                subtitle="Real class share from the backend stats endpoint."
              />
              <ConditionSplit items={data.byCondition || []} />
            </Panel>

            <Panel glow>
              <SectionTitle
                eyebrow="Score Shape"
                title="Rating distribution"
                subtitle="How the review scores are spread across the dataset."
              />
              {(data.ratingDistribution || []).length ? (
                <DistributionBars items={data.ratingDistribution} />
              ) : (
                <EmptyState message="No rating distribution data returned." />
              )}
            </Panel>
          </div>
        </>
      ) : null}
    </div>
  );
}

function OverviewPage() {
  const { data, loading, error, reload } = useFetch(API.stats());

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={`Failed to load stats: ${error}`} onRetry={reload} />;
  if (!data) return <EmptyState message="No overview data returned from the server." />;

  return (
    <div className="page-stack">
      <SectionTitle
        eyebrow="Deep View"
        title="Dataset overview"
        subtitle={`${formatNumber(data.totalReviews)} reviews are currently available from the API.`}
      />

      <div className="stats-grid">
        <StatTile label="Total Reviews" value={formatNumber(data.totalReviews)} note="Full dataset exposure" />
        <StatTile label="Average Rating" value={formatDecimal(data.avgRating, 2)} note="Patient satisfaction score" warm />
        <StatTile label="Unique Drugs" value={formatNumber(data.uniqueDrugs)} note="Drug names represented" />
        <StatTile label="Useful Votes" value={formatNumber(data.totalUsefulVotes)} note="Review helpfulness captured" />
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
            <EmptyState message="No rating distribution data returned." />
          )}
        </Panel>
      </div>

      <Panel glow>
        <SectionTitle
          eyebrow="Top Performers"
          title="Top drugs by rating"
          subtitle="Table remains empty rather than fabricated if the endpoint returns no rows."
        />

        {(data.topDrugs || []).length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Drug</th>
                  <th>Condition</th>
                  <th>Reviews</th>
                  <th>Average Rating</th>
                  <th>Useful Votes</th>
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
          <EmptyState message="No top drug rows returned from the server." />
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

  return (
    <div className="page-stack">
      <SectionTitle
        eyebrow="Review Stream"
        title="Patient review explorer"
        subtitle="Search, filter, and inspect live review entries from your backend."
      />

      <Panel className="filter-panel" glow>
        <input
          className="control"
          type="text"
          value={searchInput}
          placeholder="Search drug or review text..."
          onChange={(event) => setSearchInput(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && applySearch()}
        />
        <select
          className="control"
          value={filterCond}
          onChange={(event) => {
            setFilterCond(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All Conditions</option>
          {Object.keys(CONDITIONS).map((condition) => (
            <option key={condition} value={condition}>
              {condition}
            </option>
          ))}
        </select>
        <select
          className="control"
          value={sort}
          onChange={(event) => {
            setSort(event.target.value);
            setPage(1);
          }}
        >
          <option value="rating_desc">Rating: High to Low</option>
          <option value="rating_asc">Rating: Low to High</option>
          <option value="useful_desc">Most Useful</option>
          <option value="date_desc">Newest First</option>
        </select>
        <button className="primary-button" onClick={applySearch}>
          Apply Search
        </button>
      </Panel>

      {loading ? <LoadingState label="Loading reviews..." /> : null}
      {error ? <ErrorState message={`Failed to load reviews: ${error}`} onRetry={reload} /> : null}

      {!loading && !error && data ? (
        <>
          <Panel className="reviews-meta">
            <div>
              <p className="eyebrow">Live Pagination</p>
              <h3>
                Page {data.page} of {data.pages}
              </h3>
            </div>
            <StatusPill warm>{formatNumber(data.total)} total reviews</StatusPill>
          </Panel>

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
            <EmptyState message="No reviews matched your current filters." />
          )}

          {data.pages > 1 ? (
            <div className="pagination">
              <button className="ghost-button" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                Previous
              </button>
              <span className="pagination-label">
                {page} / {data.pages}
              </span>
              <button
                className="ghost-button"
                disabled={page === data.pages}
                onClick={() => setPage((value) => Math.min(data.pages, value + 1))}
              >
                Next
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function PredictorPage() {
  const [symptoms, setSymptoms] = useState("");
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [error, setError] = useState(null);

  async function runPrediction() {
    if (!symptoms.trim()) return;

    setLoading(true);
    setError(null);
    setPrediction(null);
    setRecommendations(null);

    try {
      const predictionResponse = await fetch(API.predict(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms }),
      });

      if (!predictionResponse.ok) {
        throw new Error(`Prediction failed (${predictionResponse.status})`);
      }

      const predictionJson = await predictionResponse.json();
      setPrediction(predictionJson);

      const recommendationResponse = await fetch(API.recommend(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ condition: predictionJson.condition }),
      });

      if (!recommendationResponse.ok) {
        throw new Error(`Recommendation failed (${recommendationResponse.status})`);
      }

      const recommendationJson = await recommendationResponse.json();
      setRecommendations(recommendationJson);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const meta = prediction ? getConditionMeta(prediction.condition) : NEUTRAL;

  return (
    <div className="page-stack">
      <SectionTitle
        eyebrow="Model Assistant"
        title="Condition predictor"
        subtitle="Enter patient symptoms and receive live classification plus recommendation output from the backend."
      />

      <div className="predict-grid">
        <Panel glow>
          <label className="input-label" htmlFor="symptoms">
            Patient symptoms
          </label>
          <textarea
            id="symptoms"
            className="textarea"
            value={symptoms}
            onChange={(event) => setSymptoms(event.target.value)}
            placeholder="Describe the patient presentation, symptoms, severity, and any timeline details here..."
            rows={8}
          />
          <button className="primary-button full-width" disabled={loading || !symptoms.trim()} onClick={runPrediction}>
            {loading ? "Analysing..." : "Predict Condition"}
          </button>
          {error ? <ErrorState message={error} /> : null}
        </Panel>

        <div className="predict-results">
          {prediction ? (
            <Panel className="prediction-card" glow>
              <p className="eyebrow">Predicted Condition</p>
              <h3 style={{ color: meta.text }}>{prediction.condition}</h3>
              <div className="prediction-ring">
                <RingGauge
                  label="Confidence"
                  value={formatPercent(prediction.confidence)}
                  note="Model certainty"
                  percent={Number(prediction.confidence) || 0}
                  accent={meta.accent}
                />
              </div>
              {prediction.clinicalBasis ? <p className="prediction-copy">{prediction.clinicalBasis}</p> : null}
              {prediction.summary ? <p className="prediction-summary">{prediction.summary}</p> : null}
            </Panel>
          ) : (
            <EmptyState message="Prediction results will appear here after the live model responds." />
          )}

          {recommendations ? (
            <Panel glow>
              <SectionTitle eyebrow="Recommendation Layer" title="Suggested drugs" />
              {(recommendations.drugs || []).length ? (
                <div className="recommendation-list">
                  {recommendations.drugs.map((drug, index) => (
                    <div className="recommendation-card" key={`${drug.name}-${index}`}>
                      <div className="recommendation-head">
                        <div>
                          <p className="recommendation-name">{drug.name}</p>
                          {drug.class ? <p className="recommendation-class">{drug.class}</p> : null}
                        </div>
                        {drug.effectiveness !== undefined ? (
                          <StatusPill warm>{formatPercent(drug.effectiveness)}</StatusPill>
                        ) : null}
                      </div>
                      {drug.effectiveness !== undefined ? (
                        <div className="condition-bar recommendation-bar">
                          <span style={{ width: `${clamp(drug.effectiveness)}%` }} />
                        </div>
                      ) : null}
                      {drug.sideEffects ? <p className="recommendation-text"><strong>Side effects:</strong> {drug.sideEffects}</p> : null}
                      {drug.notes ? <p className="recommendation-text">{drug.notes}</p> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="The recommendation endpoint returned no drug suggestions." />
              )}
              {recommendations.disclaimer ? <p className="disclaimer">{recommendations.disclaimer}</p> : null}
            </Panel>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("dashboard");

  return (
    <AppShell>
      <header className="topbar">
        <div className="brand-block">
          <button className="brand-button" onClick={() => setPage("dashboard")}>
            <span className="brand-mark" />
            <div>
              <strong>MedInsight AI</strong>
              <span>Drug review intelligence workspace</span>
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

        <StatusPill>Warm dashboard</StatusPill>
      </header>

      <main className="main-shell">
        {page === "dashboard" ? <DashboardPage onNav={setPage} /> : null}
        {page === "overview" ? <OverviewPage /> : null}
        {page === "reviews" ? <ReviewsPage /> : null}
        {page === "predict" ? <PredictorPage /> : null}
      </main>

      <footer className="footer">
        <span>Live frontend for your ML pipeline project</span>
        <span>Data remains empty unless your API returns it</span>
      </footer>
    </AppShell>
  );
}
