import mongoose, { mongo } from "mongoose";

const submissionSchema = mongoose.Schema(
  {
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
    },
    submittedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    studentsInRoom: [
      {
        type: String,
        trim: true,
      },
    ],
    code: {
      type: String,
      required: true,
      trim: true,
    },
    output: {
      type: String,
      trim: true,
    },
    expectedOutput: {
      type: String,
      trim: true,
    },
    isValidated: {
      type: Boolean,
      default: false,
    },
    outputMatches: {
      type: Boolean,
      default: false,
    },
    marks: {
      type: String,
    },
    aiEvaluation: {
      status: {
        type: String,
        enum: ["pending", "completed", "failed"],
        default: "pending",
      },
      category: {
        type: String,
        enum: ["hardcoded", "partial", "correct"],
      },
      score: Number,
      feedback: String,
      weaknesses: [String],
      mcqs: [
        {
          question: String,
          options: [String],
          answer: String,
        },
      ],
    },
    assessment: {
      completed: {
        type: Boolean,
        default: false,
      },
      score: {
        type: Number,
        default: 0,
      },
      answers: [
        {
          questionIndex: Number,
          selectedOption: String,
          isCorrect: Boolean,
        },
      ],
    },
  },
  {
    timestamps: true,
  },
);

const Submission = mongoose.model("Submission", submissionSchema);
export default Submission;
