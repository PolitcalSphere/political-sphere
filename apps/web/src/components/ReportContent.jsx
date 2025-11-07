// Lightweight test-friendly shim for ReportContent.
// This file intentionally provides a minimal component so test runs
// that import './ReportContent' can resolve without requiring the
// full implementation file (which is more complex). Using .jsx
// ensures the test transform accepts JSX syntax.
export default function ReportContentMock() {
  return <div data-testid="report-content">ReportContent Mock</div>;
}
