import mongoose from "mongoose";

const classSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    // courseCode: {
    //   type: String,
    //   unique: true,
    //   enum: ["22CS51", "22CS52", "22CS53", "22CS541", "22CS542"],
    //   required: true,
    // },
    // division: {
    //   type: String,
    //   required: true,
    //   uppercase: true,
    // },
    classId: {
      type: String,
      unique: true,
      required: true,
    },
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    assignments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Assignment",
      },
    ],
  },
  {
    timestamps: true,
  },
);

const Class = mongoose.model("Class", classSchema);
export default Class;
