import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.static(path.join(__dirname, "../public")));
app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
  const allowedOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
  res.header("Access-Control-Allow-Origin", allowedOrigin);
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

//User
import userRoutes from "./routes/user.route.js";
app.use("/api/user", userRoutes);

//Class
import classRoutes from "./routes/class.route.js";
app.use("/api/class", classRoutes);

//Assigenment
import assignmentRoutes from "./routes/assignment.route.js";
app.use("/api/assignment", assignmentRoutes);

//Execute Code
import executionRoutes from "./routes/execute.route.js";
app.use("/api/execute", executionRoutes);

//Submission
import submissionRoutes from "./routes/submission.route.js";
app.use("/api/submission", submissionRoutes);

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "../public", "index.html"));
});

//Import of error handling middleware
import { errorHandler } from "./middlewares/error.middleware.js";
app.use(errorHandler);

export default app;
