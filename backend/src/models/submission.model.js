import mongoose, { mongo } from "mongoose";

const submissionSchema = mongoose.Schema(
  {
    facultyId: {
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
    marks: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);
