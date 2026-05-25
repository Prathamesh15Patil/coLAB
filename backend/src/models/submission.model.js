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
  },
  {
    timestamps: true,
  },
);

const Submission = mongoose.model("Submission", submissionSchema);
export default Submission;
