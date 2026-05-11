import { API, useFetch } from "../shared/appCore";
import { ConditionCards, ConditionSplit, DistributionBars, EmptyState, HeroSlideshow, ImageRibbon, LoadingState, Panel, SectionTitle, StatusPill } from "../shared/AppShared";

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

export default function DashboardPage({ onNav }) {
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
