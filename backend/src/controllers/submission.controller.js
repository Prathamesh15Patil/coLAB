import Submission from "../models/submission.model.js";
import Assignment from "../models/assignment.model.js";
import Class from "../models/class.model.js";
import User from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { generateSubmissionPDF } from "../utils/generatePDF.js";
import geminiEvaluator from "../services/geminiEvaluator.service.js";
import fs from "fs";

// Utility to normalize output for comparison (remove trailing whitespace)
const normalizeOutput = (output) => {
  if (!output) return "";
  return output
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
};

const submitAssignment = asyncHandler(async (req, res) => {
  const { assignmentId, code, output, studentsInRoom = [] } = req.body;

  if (!assignmentId?.trim()) {
    throw new ApiError(400, "Assignment ID is required");
  }

  if (!code?.trim()) {
    throw new ApiError(400, "Code is required");
  }

  // Find assignment
  const assignment = await Assignment.findById(assignmentId)
    .populate("classId", "classId")
    .populate("createdBy", "name email");

  if (!assignment) {
    throw new ApiError(404, "Assignment not found");
  }

  // Find class
  const classDoc = await Class.findById(assignment.classId);
  if (!classDoc) {
    throw new ApiError(404, "Class not found");
  }

  // Check if user is part of a team in this assignment
  const userTeam = assignment.teams.find((team) =>
    team.members.some(
      (memberId) => memberId.toString() === req.user._id.toString(),
    ),
  );

  if (!userTeam) {
    throw new ApiError(403, "You are not part of any team for this assignment");
  }

  // Validate output against expected output if provided
  let outputMatches = false;
  if (assignment.expectedOutput) {
    const normalizedExpected = normalizeOutput(assignment.expectedOutput);
    const normalizedActual = normalizeOutput(output || "");
    outputMatches = normalizedExpected === normalizedActual;
  }

  const studentsToStore =
    studentsInRoom.length > 0 ? studentsInRoom : ["Student"];

  // Create submission
  const submission = await Submission.create({
    assignmentId: assignment._id,
    submittedBy: userTeam.members,
    studentsInRoom: studentsToStore,
    code: code.trim(),
    output: output?.trim() || "",
    expectedOutput: assignment.expectedOutput || "",
    isValidated: !!assignment.expectedOutput,
    outputMatches,
  });

  if (!submission) {
    throw new ApiError(500, "Failed to create submission");
  }

  // Add submitted students to assignment status without duplicates
  await Assignment.findByIdAndUpdate(assignment._id, {
    $addToSet: {
      submittedStudents: {
        $each: studentsToStore,
      },
    },
  });

  try {
    const evaluation = await geminiEvaluator({
      title: assignment.title,
      description: assignment.description,
      sampleInput: assignment.sampleInput,
      sampleOutput: assignment.sampleOutput,
      code: submission.code,
      language: assignment.language,
    });

    submission.aiEvaluation = {
      status: "completed",
      ...evaluation,
    };
  } catch (error) {
    console.error("Gemini evaluation failed:", error);
    submission.aiEvaluation = {
      status: "failed",
    };
  }

  await submission.save();

  res.status(201).json({
    message: "Assignment submitted successfully",
    submission: {
      _id: submission._id,
      assignmentId: submission.assignmentId,
      outputMatches: submission.outputMatches,
      isValidated: submission.isValidated,
      aiEvaluation: submission.aiEvaluation,
      createdAt: submission.createdAt,
    },
  });
});

const getSubmissionPDF = asyncHandler(async (req, res) => {
  const { submissionId } = req.params;

  if (!submissionId?.trim()) {
    throw new ApiError(400, "Submission ID is required");
  }

  // Find submission
  const submission = await Submission.findById(submissionId)
    .populate("assignmentId")
    .populate("submittedBy", "name email");

  if (!submission) {
    throw new ApiError(404, "Submission not found");
  }

  // Authorization: only team members or faculty can access
  const isTeamMember = submission.submittedBy.some(
    (member) => member._id.toString() === req.user._id.toString(),
  );

  const assignment = await Assignment.findById(
    submission.assignmentId,
  ).populate("classId");
  const isFaculty =
    assignment.createdBy.toString() === req.user._id.toString() ||
    assignment.classId.facultyId.toString() === req.user._id.toString();

  if (!isTeamMember && !isFaculty) {
    throw new ApiError(403, "Unauthorized to access this submission");
  }

  try {
    // Get room members info for the PDF (use studentsInRoom if available)
    const studentsInRoom =
      submission.studentsInRoom && submission.studentsInRoom.length > 0
        ? submission.studentsInRoom
        : submission.submittedBy.map((user) => user.name);

    // Prepare PDF data
    const pdfData = {
      classCode: assignment.classId.classId,
      assignmentTitle: assignment.title,
      assignmentDescription: assignment.description,
      sampleInput: assignment.sampleInput,
      sampleOutput: assignment.sampleOutput,
      maximumMarks: 10,
      submittedBy: studentsInRoom.join(", "),
      studentsInRoom,
      submissionDate: submission.createdAt,
      code: submission.code,
      aiEvaluation: submission.aiEvaluation,
      assessment: submission.assessment,
    };

    // Generate PDF
    const pdfPath = await generateSubmissionPDF(pdfData);

    // Read and send the file
    const fileContent = fs.readFileSync(pdfPath);
    const filename = `${assignment.classId.classId}_${assignment.title}_submission.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(fileContent);

    // Clean up the temporary file after sending
    fs.unlink(pdfPath, (err) => {
      if (err) console.error("Failed to delete temporary PDF:", err);
    });
  } catch (error) {
    throw new ApiError(500, `Failed to generate PDF: ${error.message}`);
  }
});

const getSubmissionsByAssignment = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;

  if (!assignmentId?.trim()) {
    throw new ApiError(400, "Assignment ID is required");
  }

  // Find assignment
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) {
    throw new ApiError(404, "Assignment not found");
  }

  // Authorization: only faculty can view all submissions
  if (assignment.createdBy.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Only assignment creator can view submissions");
  }

  // Get all submissions for this assignment
  const submissions = await Submission.find({
    assignmentId,
  })
    .populate("submittedBy", "name email")
    .sort({ createdAt: -1 });

  res.status(200).json({
    message: "Submissions fetched successfully",
    submissions,
  });
});

const submitSubmissionAssessment = asyncHandler(async (req, res) => {
  const { submissionId } = req.params;
  const { answers } = req.body;

  if (!submissionId?.trim()) {
    throw new ApiError(400, "Submission ID is required");
  }

  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    throw new ApiError(400, "Answers must be provided as an object");
  }

  const submission = await Submission.findById(submissionId).populate(
    "submittedBy",
    "_id",
  );

  if (!submission) {
    throw new ApiError(404, "Submission not found");
  }

  const isTeamMember = submission.submittedBy.some(
    (member) => member._id.toString() === req.user._id.toString(),
  );

  if (!isTeamMember) {
    throw new ApiError(
      403,
      "Unauthorized to submit assessment for this submission",
    );
  }

  const mcqs = submission.aiEvaluation?.mcqs || [];
  if (!mcqs.length) {
    throw new ApiError(400, "No MCQs available for this submission");
  }

  const submittedAnswers = Object.keys(answers);
  if (submittedAnswers.length !== mcqs.length) {
    throw new ApiError(400, "Please answer all questions");
  }

  const assessmentAnswers = mcqs.map((mcq, index) => {
    const selectedOption = answers[String(index)];
    const isCorrect = selectedOption === mcq.answer;
    return {
      questionIndex: index,
      selectedOption: selectedOption || "",
      isCorrect,
    };
  });

  const score = assessmentAnswers.reduce(
    (total, answer) => total + (answer.isCorrect ? 1 : 0),
    0,
  );

  submission.assessment = {
    completed: true,
    score,
    answers: assessmentAnswers,
  };

  await submission.save();

  res.status(200).json({
    message: "Assessment submitted successfully",
    submission,
  });
});

export {
  submitAssignment,
  getSubmissionPDF,
  getSubmissionsByAssignment,
  submitSubmissionAssessment,
};
