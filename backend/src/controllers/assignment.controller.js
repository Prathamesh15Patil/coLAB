import Assignment from "../models/assignment.model.js";
import User from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

const createAssignment = asyncHandler(async (req, res) => {
  const { classId } = req.params;
  const { title, description, dueDate, language } = req.body;
  const classDoc = await Class.findOne({ classId });
  if (!classDoc) {
    throw new ApiError(404, "Class not found");
  }
  if (classDoc.facultyId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Unauthorized");
  }

  //all fields are required error check to be added

  const newAssignment = await Assignment.create({
    classId: classDoc._id,
    createdBy: req.user._id,
    title,
    description,
    dueDate,
    language,
  });
  if (!newAssignment) {
    throw new ApiError(500, "Failed to create assignment");
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
    if (classDoc.facultyid.toString() !== req.user._id.toString()) {
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
  }).sort({ createdAt: -1 });

  res.status(200).json({
    message: "Assignments fetched successfully",
    assignments,
  });
});

const getAssignmentById = asyncHandler(async (req, res) => {
  const { assId } = req.params;

  // Find assignment
  const assignment = await Assignment.findById(assId);

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
    if (classDoc.facultyid.toString() !== req.user._id.toString()) {
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
  const { title, description, dueDate, language } = req.body;
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
