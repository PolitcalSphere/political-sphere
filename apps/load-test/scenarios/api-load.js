// STATUS: PENDING_IMPLEMENTATION
// k6 API load test scenario

import { check } from "k6";
import http from "k6/http";

export const options = {
  vus: 50,
  duration: "30s",
};

export default function () {
  const res = http.get("http://localhost:3000/api/health");
  check(res, {
    "status is 200": (r) => r.status === 200,
  });
}
