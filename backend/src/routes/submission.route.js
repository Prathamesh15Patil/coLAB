import express from "express";
import {
  submitAssignment,
  getSubmissionPDF,
  getSubmissionsByAssignment,
  submitSubmissionAssessment,
} from "../controllers/submission.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

// All submission routes require authentication
router.use(verifyJWT);

// Submit assignment
router.post("/submit", submitAssignment);

// Get submission as PDF
router.get("/:submissionId/pdf", getSubmissionPDF);

// Submit assessment for MCQs
router.post("/:submissionId/assessment", submitSubmissionAssessment);

// Get all submissions for an assignment (faculty only)
router.get("/assignment/:assignmentId", getSubmissionsByAssignment);

export default router;
