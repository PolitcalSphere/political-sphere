import express from "express";

const app = express();
const port = Number(process.env.PORT ?? 4016);

app.get("/health", (_req, res) => {
	res.json({ status: "ok", name: "duckduckgo-mcp" });
});

app.get("/search", async (req, res) => {
	const query = req.query.q;
	if (typeof query !== "string" || query.trim().length === 0) {
		return res.status(400).json({ error: "query parameter q required" });
	}

	try {
		const endpoint = new URL("https://api.duckduckgo.com/");
		endpoint.searchParams.set("q", query);
		endpoint.searchParams.set("format", "json");
		endpoint.searchParams.set("no_redirect", "1");
		endpoint.searchParams.set("no_html", "1");

		const response = await fetch(endpoint, {
			headers: { "User-Agent": "political-sphere-mcp/1.0 (+https://github.com/)" },
		});

		if (!response.ok) {
			return res.status(502).json({
				error: "DuckDuckGo request failed",
				status: response.status,
				statusText: response.statusText,
			});
		}

		const payload = await response.json();
		res.json({ source: "duckduckgo", query, data: payload });
	} catch (error) {
		console.error("DuckDuckGo proxy error:", error);
		res.status(502).json({ error: "proxy error", details: String(error) });
	}
});

app.listen(port, () => {
	console.log(
		`DuckDuckGo MCP stub listening on http://localhost:${port} — /health /search?q=...`,
	);
});
