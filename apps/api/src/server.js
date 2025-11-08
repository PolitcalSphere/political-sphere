const { NewsService } = require("./news-service");
const { JsonNewsStore } = require("./newsStore");

function createNewsServer(options = {}) {
	const newsService = new NewsService();
	const newsStore = new JsonNewsStore();

	return {
		newsService,
		newsStore,
	};
}

module.exports = { createNewsServer };
