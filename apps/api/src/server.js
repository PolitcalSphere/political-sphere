const { NewsService } = require('./news-service');
const { JsonNewsStore } = require('./newsStore');

function createNewsServer(_options = {}) {
  const newsService = new NewsService();
  const newsStore = new JsonNewsStore();

  return {
    newsService,
    newsStore,
  };
}

module.exports = { createNewsServer };
