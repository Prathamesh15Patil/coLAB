import Assignment from "../models/assignment.model.js";
import Class from "../models/class.model.js";
import User from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

const createAssignment = asyncHandler(async (req, res) => {
  const {
    classId,
    title,
    description,
    dueDate,
    language,
    sampleInput,
    sampleOutput,
    expectedOutput,
  } = req.body;

  if (!classId?.trim()) {
    throw new ApiError(400, "Class ID is required");
  }
  if (!title?.trim() || !description?.trim() || !dueDate?.trim()) {
    throw new ApiError(400, "Title, description, and due date are required");
  }

  const classDoc = await Class.findOne({ classId: classId.trim() });
  if (!classDoc) {
    throw new ApiError(404, "Class not found");
  }
  if (classDoc.facultyId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Unauthorized");
  }

  const newAssignment = await Assignment.create({
    classId: classDoc._id,
    createdBy: req.user._id,
    title: title.trim(),
    description: description.trim(),
    dueDate: new Date(dueDate),
    language: language || "java",
    sampleInput: sampleInput?.trim() || undefined,
    sampleOutput: sampleOutput?.trim() || undefined,
    expectedOutput: expectedOutput?.trim() || undefined,
  });
  if (!newAssignment) {
    throw new ApiError(500, "Failed to create assignment");
  }

  // IMPLEMENTATION: generate random teams (pairs) from students enrolled in the class.
  // If total number is odd, make one team of three. At most one team of three will be created.
  try {
    const studentIds = (classDoc.students || []).map((s) => s.toString());

    const teams = [];
    if (studentIds.length >= 2) {
      // shuffle studentIds (Fisher-Yates)
      for (let i = studentIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = studentIds[i];
        studentIds[i] = studentIds[j];
        studentIds[j] = tmp;
      }

      // If odd, take last three as one team, otherwise pair sequentially
      let startIndex = 0;
      if (studentIds.length % 2 === 1) {
        if (studentIds.length === 3) {
          teams.push({ members: studentIds.slice(0, 3) });
          startIndex = 3;
        } else {
          // take last 3 as a team to preserve randomness
          const lastThree = studentIds.splice(-3);
          teams.push({ members: lastThree });
        }
      }

      // pair remaining students
      for (let i = 0; i < studentIds.length; i += 2) {
        if (studentIds[i + 1]) {
          teams.push({ members: [studentIds[i], studentIds[i + 1]] });
        }
      }
    }

    if (teams.length > 0) {
      await Assignment.findByIdAndUpdate(newAssignment._id, {
        $set: { teams },
      });
    }
  } catch (err) {
    // pairing failure should not block assignment creation; log and continue
    console.error("Failed to generate teams for assignment", err);
  }

  await Class.findByIdAndUpdate(classDoc._id, {
    $addToSet: {
      assignments: newAssignment._id,
    },
  });

  res.status(201).json({
    message: "Assignment created successfully",
    newAssignment,
  });
});

const getAssignmentsByClass = asyncHandler(async (req, res) => {
  const { classId } = req.params;

  // Find class using human-readable classId (e.g., 22CS51-26B)
  const classDoc = await Class.findOne({ classId });

  if (!classDoc) {
    throw new ApiError(404, "Class not found");
  }

  // Authorization:
  // - Faculty can view only if they own the class
  // - Students can view only if enrolled in the class
  if (req.user.role === "faculty") {
    if (classDoc.facultyId.toString() !== req.user._id.toString()) {
      throw new ApiError(403, "Unauthorized");
    }
  } else {
    const isEnrolled = classDoc.students.some(
      (studentId) => studentId.toString() === req.user._id.toString(),
    );

    if (!isEnrolled) {
      throw new ApiError(403, "Unauthorized");
    }
  }

  // Fetch all assignments belonging to this class
  const assignments = await Assignment.find({
    classId: classDoc._id,
  })
    .sort({ createdAt: -1 })
    .populate("teams.members", "name email role");

  res.status(200).json({
    message: "Assignments fetched successfully",
    assignments,
  });
});

const getAssignmentById = asyncHandler(async (req, res) => {
  const { assId } = req.params;

  // Find assignment
  const assignment = await Assignment.findById(assId).populate(
    "teams.members",
    "name email role",
  );

  if (!assignment) {
    throw new ApiError(404, "Assignment not found");
  }

  // Find parent class for authorization
  const classDoc = await Class.findById(assignment.classId);

  if (!classDoc) {
    throw new ApiError(404, "Class not found");
  }

  // Authorization:
  // - Faculty can view only if they own the class
  // - Students can view only if enrolled in the class
  if (req.user.role === "faculty") {
    if (classDoc.facultyId.toString() !== req.user._id.toString()) {
      throw new ApiError(403, "Unauthorized");
    }
  } else {
    const isEnrolled = classDoc.students.some(
      (studentId) => studentId.toString() === req.user._id.toString(),
    );

    if (!isEnrolled) {
      throw new ApiError(403, "Unauthorized");
    }
  }

  res.status(200).json({
    message: "Assignment fetched successfully",
    assignment,
  });
});

const updateAssignment = asyncHandler(async (req, res) => {
  const { assId } = req.params;
  const assignment = await Assignment.findById(assId);
  if (!assignment) {
    throw new ApiError(404, "Assignment not found");
  }
  const { title, description, dueDate, language, sampleInput, sampleOutput } =
    req.body;
  if (assignment.createdBy.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Only faculty can update assignment");
  }

  const updatedAssignment = await Assignment.findByIdAndUpdate(
    assId,
    {
      title,
      description,
      dueDate,
      language,
      sampleInput: sampleInput?.trim() || undefined,
      sampleOutput: sampleOutput?.trim() || undefined,
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!updatedAssignment) {
    throw new ApiError(500, `Failed to update Assignemnt -${assId}`);
  }
  res.status(200).json({
    message: "Assignment updated successfully",
    updatedAssignment,
  });
});

const deleteAssignment = asyncHandler(async (req, res) => {
  //REMEMBER --> in delete Clean-up first , Delete Next
  //First remove that to be deleted component from other models next delete it from its own.
  //here it is not done , could be in next version but remember for next functions.
  const { assId } = req.params;
  const assignment = await Assignment.findById(assId);

  if (!assignment) {
    throw new ApiError(404, "Assignment not found");
  }

  if (assignment.createdBy.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Only faculty can delete assignment");
  }

  if (await Assignment.findByIdAndDelete(assignment._id)) {
    await Class.findByIdAndUpdate(assignment.classId, {
      $pull: {
        assignments: assignment._id,
      },
    });

    res.status(200).json({
      message: "Deleted assignment successfully",
    });
  } else {
    throw new ApiError(500, "Failed to delete assignment");
  }
});

export {
  createAssignment,
  deleteAssignment,
  updateAssignment,
  getAssignmentById,
  getAssignmentsByClass,
};
