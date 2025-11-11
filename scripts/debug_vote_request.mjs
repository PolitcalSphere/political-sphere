import express from "express";
import request from "supertest";
import votesRouter from "../src/routes/votes.js";
import usersRouter from "../src/routes/users.js";
import billsRouter from "../src/routes/bills.js";
import { getDatabase, closeDatabase } from "../src/stores/index.js";

(async () => {
  getDatabase();
  const app = express();
  app.use(express.json());
  app.use("/api", usersRouter);
  app.use("/api", billsRouter);
  app.use("/api", votesRouter);

  const userRes = await request(app)
    .post("/api/users")
    .send({ username: "testuser", email: "test@example.com" });
  console.log("User status", userRes.status);
  console.log("User body", userRes.body);

  const billRes = await request(app)
    .post("/api/bills")
    .send({ title: "Test Bill", description: "desc", proposerId: userRes.body.id });
  console.log("Bill status", billRes.status);
  console.log("Bill body", billRes.body);

  const voteRes = await request(app)
    .post("/api/votes")
    .send({ billId: billRes.body.id, userId: userRes.body.id, vote: "aye" });
  console.log("Vote status", voteRes.status);
  console.log("Vote body", voteRes.text || voteRes.body);

  closeDatabase();
})();
