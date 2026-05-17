import express from "express";
import cookieParser from "cookie-parser";

const app = express();

app.use(express.json());
app.use(cookieParser());

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

//Import of error handling middleware
import { errorHandler } from "./middlewares/error.middleware.js";
app.use(errorHandler);

export default app;
