// Mock index file for testing
const express = require("express");
const { closeDatabase, getDatabase } = require("./modules/stores/index.js");

const app = express();
app.use(express.json());

// Mock routes
app.get("/health", (req, res) => {
	res.json({ status: "ok" });
});

app.get("/users", (req, res) => {
	res.json({ users: [] });
});

app.get("/parties", (req, res) => {
	res.json({ parties: [] });
});

module.exports = { app, closeDatabase, getDatabase };
