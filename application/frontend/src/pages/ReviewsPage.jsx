// ReviewsPage.jsx - Updated version with autocomplete for review submission
import { useState, useRef, useEffect } from "react";
import { API, BASE_URL, CONDITIONS, formatDecimal, formatNumber, getConditionMeta, useFetch } from "../shared/appCore";
import { ConditionBadge, EmptyState, ErrorState, LoadingState, Panel, SectionTitle } from "../shared/AppShared";

// ─── DrugAutocomplete ──────────────────────────────────────────────────────────
// Reusable input with live drug-name suggestions.
function DrugAutocomplete({ value, onChange, onKeyDown, placeholder, className = "", id }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const debounceRef = useRef(null);
  const wrapRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    if (!value || value.trim().length < 2) {
      const timeoutId = setTimeout(() => {
        setSuggestions([]);
        setOpen(false);
      }, 0);
      return () => clearTimeout(timeoutId);
    }
    
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      try {
        const url = `${BASE_URL}/api/reviews?page=1&condition=&search=${encodeURIComponent(value.trim())}&sort=rating_desc&page_size=50`;
        const res = await fetch(url, { signal: abortRef.current.signal });
        if (!res.ok) throw new Error("non-200");
        const json = await res.json();

        const q = value.trim().toLowerCase();
        const seen = new Set();
        const list = [];
        for (const review of json.reviews ?? []) {
          const name = review.drug;
          if (!name || seen.has(name)) continue;
          seen.add(name);
          if (name.toLowerCase().startsWith(q) || name.toLowerCase().includes(q)) {
            list.push(name);
          }
          if (list.length >= 8) break;
        }
        setSuggestions(list);
        setOpen(list.length > 0);
        setHighlighted(-1);
      } catch (err) {
        if (err.name !== "AbortError") {
          setSuggestions([]);
          setOpen(false);
        }
      } finally {
        setLoading(false);
      }
    }, 260);
    
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value]);

  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function selectSuggestion(name) {
    onChange(name);
    setSuggestions([]);
    setOpen(false);
    setHighlighted(-1);
  }

  function handleKeyDown(e) {
    if (open && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlighted((h) => Math.min(h + 1, suggestions.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlighted((h) => Math.max(h - 1, 0));
        return;
      }
      if (e.key === "Enter" && highlighted >= 0) {
        e.preventDefault();
        selectSuggestion(suggestions[highlighted]);
        return;
      }
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
    }
    onKeyDown?.(e);
  }

  return (
    <div className="drug-autocomplete-wrap" ref={wrapRef}>
      <div className="drug-autocomplete-input-row">
        <input
          id={id}
          className={`control drug-autocomplete-input ${className}`}
          type="text"
          autoComplete="off"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-haspopup="listbox"
        />
        {loading && <span className="drug-spinner" aria-label="Loading suggestions…" />}
      </div>
      {open && suggestions.length > 0 && (
        <ul className="drug-suggestions" role="listbox">
          {suggestions.map((name, i) => (
            <li
              key={name}
              role="option"
              aria-selected={i === highlighted}
              className={`drug-suggestion-item${i === highlighted ? " drug-suggestion-item-active" : ""}`}
              onMouseDown={(e) => { e.preventDefault(); selectSuggestion(name); }}
              onMouseEnter={() => setHighlighted(i)}
            >
              <span className="drug-suggestion-icon">💊</span>
              <span className="drug-suggestion-name">{highlightMatch(name, value)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function highlightMatch(name, query) {
  if (!query) return name;
  const idx = name.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return name;
  return (
    <>
      {name.slice(0, idx)}
      <strong>{name.slice(idx, idx + query.length)}</strong>
      {name.slice(idx + query.length)}
    </>
  );
}

// ─── ReviewSubmissionSection with Autocomplete ─────────────────────────────────
function ReviewSubmissionSection({ onSubmitted }) {
  const [drug, setDrug] = useState("");
  const [condition, setCondition] = useState("");
  const [rating, setRating] = useState("");
  const [review, setReview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!drug.trim() || !condition || !rating || !review.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${BASE_URL}/api/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drug: drug.trim(),
          condition,
          rating: parseFloat(rating),
          review: review.trim(),
          date: new Date().toISOString().split("T")[0],
          usefulCount: 0,
        }),
      });

      if (!response.ok) throw new Error("Failed to submit review");

      setSubmitted(true);
      setDrug("");
      setCondition("");
      setRating("");
      setReview("");
      onSubmitted?.();
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Panel className="review-submission-panel" glow>
      <div className="section-title">
        <h3>Share Your Experience</h3>
        <span className="section-subtitle">Help others make informed decisions</span>
      </div>
      
      {submitted && (
        <div className="submission-success-panel panel">
          <p>✓ Thank you for sharing your review! It will help others in their journey.</p>
        </div>
      )}
      
      {error && (
        <div className="state-card state-card-error" style={{ marginBottom: "16px" }}>
          <p>⚠️ {error}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="review-form-grid">
          <DrugAutocomplete
            value={drug}
            onChange={setDrug}
            placeholder="Drug name *"
            id="drug-name"
          />
          <select
            className="control"
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            required
          >
            <option value="">Condition *</option>
            {Object.keys(CONDITIONS).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            className="control"
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            required
          >
            <option value="">Rating *</option>
            {[1,2,3,4,5,6,7,8,9,10].map(r => (
              <option key={r} value={r}>{r}/10</option>
            ))}
          </select>
          <button 
            type="submit" 
            className="primary-button" 
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit Review"}
          </button>
        </div>
        <textarea
          className="textarea review-form-textarea"
          placeholder="Share your experience with this medication... *"
          value={review}
          onChange={(e) => setReview(e.target.value)}
          rows="4"
          required
        />
        <div className="review-form-actions">
          <p className="review-form-note">
            Your honest review helps build a trusted community. All reviews are moderated for quality.
          </p>
        </div>
      </form>
    </Panel>
  );
}

// ─── ReviewsPage ───────────────────────────────────────────────────────────────
export default function ReviewsPage() {
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
        <DrugAutocomplete
          value={searchInput}
          onChange={(val) => setSearchInput(val)}
          onKeyDown={(e) => e.key === "Enter" && applySearch()}
          placeholder="Search by drug name…"
          className="filter-drug-input"
        />
        <select
          className="control"
          value={filterCond}
          onChange={(e) => { setFilterCond(e.target.value); setPage(1); }}
        >
          <option value="">All Conditions</option>
          {Object.keys(CONDITIONS).map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          className="control"
          value={sort}
          onChange={(e) => { setSort(e.target.value); setPage(1); }}
        >
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
              <button
                className="ghost-button"
                disabled={page === 1}
                onClick={() => setPage((v) => Math.max(1, v - 1))}
              >
                Previous
              </button>
              <span className="pagination-label">{page} / {data.pages}</span>
              <button
                className="ghost-button"
                disabled={page === data.pages}
                onClick={() => setPage((v) => Math.min(data.pages, v + 1))}
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