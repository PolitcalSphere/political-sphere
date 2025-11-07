// STATUS: PENDING_IMPLEMENTATION
// k6 concurrent users test

import { check, sleep } from "k6";
import http from "k6/http";

export const options = {
	stages: [
		{ duration: "2m", target: 100 },
		{ duration: "5m", target: 100 },
		{ duration: "2m", target: 0 },
	],
};

export default function () {
	// TODO: implement concurrent users test
	sleep(1);
}
