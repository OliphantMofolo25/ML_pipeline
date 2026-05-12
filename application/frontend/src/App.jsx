import { useState } from "react";
import "./App.css";
import { NAV } from "./shared/appCore";
import { AppShell } from "./shared/AppShared";
import DashboardPage from "./pages/DashboardPage";
import OverviewPage from "./pages/OverviewPage";
import PredictorPage from "./pages/PredictorPage";
import ReviewsPage from "./pages/ReviewsPage";

const pageComponents = {
  dashboard: DashboardPage,
  overview: OverviewPage,
  reviews: ReviewsPage,
  predict: PredictorPage,
};

export default function App() {
  const [page, setPage] = useState("dashboard");
  const ActivePage = pageComponents[page] || DashboardPage;

  return (
    <AppShell>
      <header className="topbar">
        <div className="brand-block">
          <button className="brand-button" onClick={() => setPage("dashboard")}>
            <span className="brand-mark" />
            <div>
              <strong>Justice's Health Care</strong>
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
        <ActivePage onNav={setPage} />
      </main>

            <footer className="footer">
        <span>Copyright 2026 All rights reserved</span>
      </footer>
    </AppShell>
  );
}

