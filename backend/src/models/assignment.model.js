import mongoose from "mongoose";
//need to think of whether to add test-cases schema or not

const assignmentSchema = mongoose.Schema(
  {
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    language: {
      enum: ["python", "java", "C", "C++", "Any"],
      type: String,
      // required:true,
      default: "java",
    },
    sampleInput: {
      type: String,
      trim: true,
    },
    expectedOutput: {
      type: String,
      trim: true,
    },
    // Teams generated when assignment is created. Each team contains member user ids.
    teams: [
      {
        members: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
        ],
      },
    ],
  },
  {
    timestamps: true,
  },
);

assignmentSchema.index({ classId: 1 });
assignmentSchema.index({ createdBy: 1 });

const Assignment = mongoose.model("Assignment", assignmentSchema);
export default Assignment;
