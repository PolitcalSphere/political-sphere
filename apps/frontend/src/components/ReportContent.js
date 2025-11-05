// Lightweight test-friendly shim for ReportContent.
// This file intentionally provides a minimal component so test runs
// that import './ReportContent' can resolve without requiring the
// full implementation file (which uses JSX in a .js file and can
// be problematic for the test transform).
import React from "react";

// Test-friendly shim: avoid JSX in a .js file to prevent transform errors.
// Use React.createElement so the file remains valid JS and is importable
// by the test runner without requiring JSX parsing.
export default function ReportContentMock() {
	return React.createElement(
		"div",
		{ "data-testid": "report-content" },
		"ReportContent Mock",
	);
}
