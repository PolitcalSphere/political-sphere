import { useCallback, useEffect, useState } from "react";

const API_BASE_URL = "/api";

function Dashboard() {
  const [news, setNews] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    categories: {},
    tags: {},
    latest: null,
  });
  const [statusMessage, setStatusMessage] = useState("Loading...");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [newsResponse, summaryResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/news`),
        fetch(`${API_BASE_URL}/metrics/news`),
      ]);

      if (!newsResponse.ok)
        throw new Error(`News API responded with ${newsResponse.status}`);
      if (!summaryResponse.ok)
        throw new Error(`Metrics API responded with ${summaryResponse.status}`);

      const newsData = await newsResponse.json();
      const summaryData = await summaryResponse.json();

      setNews(newsData.data || []);
      setSummary(
        summaryData.data || {
          total: 0,
          categories: {},
          tags: {},
          latest: null,
        }
      );
      setStatusMessage("Live data retrieved from API.");
    } catch (error) {
      setStatusMessage(`API unavailable: ${error.message}`);
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const renderNews = () => {
    if (news.length === 0) {
      return (
        <li>
          No stories yet. The data pipeline will populate this feed shortly.
        </li>
      );
    }
    return news.map((item) => (
      <li key={item.id}>
        <h2>{item.title}</h2>
        <p>{item.excerpt || item.summary || ""}</p>
        <p className="status">
          Last updated:{" "}
          <time dateTime={item.updatedAt || item.createdAt}>
            {item.updatedAt || item.createdAt
              ? new Date(item.updatedAt || item.createdAt).toLocaleString()
              : "n/a"}
          </time>
        </p>
      </li>
    ));
  };

  const renderSummary = () => {
    const { categories = {}, tags = {}, latest } = summary;
    const latestMarkup = latest ? (
      <p className="status">
        Latest: <strong>{latest.title}</strong> (
        {new Date(latest.updatedAt).toLocaleString()})
      </p>
    ) : (
      <p className="status">No recent updates yet.</p>
    );

    const categoriesMarkup =
      Object.keys(categories).length === 0 ? (
        <li>No categories recorded.</li>
      ) : (
        Object.entries(categories).map(([name, count]) => (
          <li key={name}>
            <strong>{name}:</strong> {count}
          </li>
        ))
      );

    const tagsMarkup =
      Object.keys(tags).length === 0 ? (
        <li>No tags recorded.</li>
      ) : (
        Object.entries(tags).map(([name, count]) => (
          <li key={name}>
            <strong>{name}:</strong> {count}
          </li>
        ))
      );

    return (
      <>
        <p>
          Total stories: <strong>{summary.total}</strong>
        </p>
        <p className="status">
          Summary generated at: {new Date().toLocaleString()}
        </p>
        {latestMarkup}
        <div
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            marginTop: "1rem",
          }}
        >
          <div>
            <h3>By category</h3>
            <ul>{categoriesMarkup}</ul>
          </div>
          <div>
            <h3>By tag</h3>
            <ul>{tagsMarkup}</ul>
          </div>
        </div>
      </>
    );
  };

  return (
    <main>
      <header>
        <h1>Dashboard</h1>
        <span className="status" aria-live="polite">
          {statusMessage}
        </span>
      </header>
      <section>
        <h2 id="latest-policy-signals">Latest policy signals</h2>
        <p className="status">
          Tracking emerging narratives and transparency signals from civic data
          pipelines.
        </p>
        <ul aria-labelledby="latest-policy-signals">{renderNews()}</ul>
        <button
          type="button"
          onClick={fetchData}
          disabled={loading}
          aria-describedby="refresh-description"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
        <div id="refresh-description" className="sr-only">
          Refresh the list of policy signals from the API
        </div>
      </section>
      <section>
        <h2 id="coverage-summary">Coverage summary</h2>
        <p className="status">
          Quick breakdown of categories and tags in the latest dataset.
        </p>
        <div>{renderSummary()}</div>
      </section>
      <p className="status">
        Last updated:{" "}
        <span aria-live="polite">{new Date().toLocaleString()}</span>
      </p>
    </main>
  );
}

export default Dashboard;
