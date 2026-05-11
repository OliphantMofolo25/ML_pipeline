import { API, formatDecimal, formatNumber, useFetch } from "../shared/appCore";
import { ConditionBadge, ConditionSplit, DistributionBars, EmptyState, ErrorState, LoadingState, Panel, SectionTitle, StatTile } from "../shared/AppShared";

export default function OverviewPage() {
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
