/* global __ENV */
import http from "k6/http";
import { sleep } from "k6";

export const options = {
  vus: 1,
  iterations: 10,
};

const BASE = __ENV.PERF_BASE_URL || "http://localhost:3000";

export default function () {
  http.get(BASE);
  sleep(0.2);
}
