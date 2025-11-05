const express = require("express");
const { NewsService } = require("../news-service");
const { NewsStore } = require("../news-store");
const { log } = require("../../../../libs/shared/src/log.js");

const router = express.Router();
const newsStore = new NewsStore();
const newsService = new NewsService(newsStore);

router.get("/news", async (req, res) => {
	try {
		const { category, tag, search, limit } = req.query;
		const options = {};
		if (category) options.category = category;
		if (tag) options.tag = tag;
		if (search) options.search = search;
		if (limit) options.limit = parseInt(limit, 10);

		const news = await newsService.list(options);
		res.json({ success: true, data: news });
	} catch (error) {
		log("error", "Error fetching news", { error: error instanceof Error ? error.message : String(error) });
		res.status(400).json({
			success: false,
			error: error.message,
			message: "Failed to fetch news",
		});
	}
});

router.post("/news", async (req, res) => {
	try {
		const newsItem = await newsService.create(req.body);
		res.status(201).json({ success: true, data: newsItem });
	} catch (error) {
		log("error", "Error creating news", { error: error instanceof Error ? error.message : String(error) });
		res.status(400).json({
			success: false,
			error: error.message,
			message: "Failed to create news item",
		});
	}
});

router.get("/news/:id", async (req, res) => {
	try {
		const { id } = req.params;
		const news = await newsService.list();
		const item = news.find((n) => n.id === id);
		if (!item) {
			return res.status(404).json({
				success: false,
				error: "Not found",
				message: "News item not found",
			});
		}
		res.json({ success: true, data: item });
	} catch (error) {
		log("error", "Error fetching news item", { error: error instanceof Error ? error.message : String(error), newsId: req.params.id });
		res.status(500).json({
			success: false,
			error: "Internal server error",
			message: "Failed to fetch news item",
		});
	}
});

router.put("/news/:id", async (req, res) => {
	try {
		const { id } = req.params;
		const updatedItem = await newsService.update(id, req.body);
		if (!updatedItem) {
			return res.status(404).json({
				success: false,
				error: "Not found",
				message: "News item not found",
			});
		}
		res.json({ success: true, data: updatedItem });
	} catch (error) {
		log("error", "Error updating news", { error: error instanceof Error ? error.message : String(error), newsId: req.params.id });
		res.status(400).json({
			success: false,
			error: error.message,
			message: "Failed to update news item",
		});
	}
});

router.get("/metrics/news", async (_req, res) => {
	try {
		const summary = await newsService.analyticsSummary();
		res.json({ success: true, data: summary });
	} catch (error) {
		log("error", "Error fetching news metrics", { error: error instanceof Error ? error.message : String(error) });
		res.status(500).json({
			success: false,
			error: "Internal server error",
			message: "Failed to fetch news metrics",
		});
	}
});

module.exports = router;
