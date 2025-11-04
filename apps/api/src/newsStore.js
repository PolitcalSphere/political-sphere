const store = require("./news-store");

module.exports = {
	...store,
	default: store.NewsStore,
};
