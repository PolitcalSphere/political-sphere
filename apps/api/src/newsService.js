// Compatibility shim: tests import `newsService.js` (camelCase) while
// implementation file is `news-service.js`. Re-export the class here so both
// import styles work.
const { NewsService } = require("./news-service");

module.exports = NewsService;
module.exports.NewsService = NewsService;
