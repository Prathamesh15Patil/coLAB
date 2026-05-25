import Class from "../models/class.model.js";
import User from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

const create = asyncHandler(async (req, res) => {
  const { name, courseCode, division } = req.body;
  if (req.user.role !== "faculty") {
    throw new ApiError(403, "Unauthorized");
  }

  if (
    ![name, courseCode, division].every(
      (field) => typeof field === "string" && field.trim(),
    )
  ) {
    throw new ApiError(400, "Name, courseCode, and division are required");
  }

  const normalizedCourseCode = courseCode.trim().toUpperCase();
  const normalizedDivision = division.trim().toUpperCase();
  const currentYear = new Date().getFullYear().toString().slice(-2);
  const classCode = `${normalizedCourseCode}-${currentYear}${normalizedDivision}`;

  const existingClass = await Class.findOne({ classId: classCode });
  if (existingClass) {
    throw new ApiError(
      400,
      "Class with this course code and division already exists",
    );
  }

  const newClass = await Class.create({
    facultyId: req.user._id,
    name: name.trim(),
    classId: classCode,
    students: [],
    assignments: [],
  });

  if (!newClass) {
    throw new ApiError(500, "Failed to create class");
  }

  const updateClassesTeaching = await User.findOneAndUpdate(
    { _id: req.user._id },
    {
      $addToSet: {
        classesTeaching: newClass._id,
      },
    },
    { new: true },
  );

  if (!updateClassesTeaching) {
    throw new ApiError(500, "Failed to update faculty's teaching classes");
  }

  res.status(201).json({
    message: "Class created successfully",
    class: newClass,
  });
});

const join = asyncHandler(async (req, res) => {
  const { classId } = req.body;
  if (req.user.role !== "student") {
    throw new ApiError(403, "Unauthorized");
  }
  const findClass = await Class.findOne({ classId });
  if (!findClass) {
    throw new ApiError(404, "Class not found");
  }
  //In point 1 and point 2 the base operation is same i.e. adding the class and student to respective list of their model. This is a repetative operation.
  //We can make a common Db function for this to handle this to avoid repetation and make code cleaner. But for now I am keeping it as it is to avoid confusion and maintain clarity of the operations being performed.

  // --> example utility function
  // async function addToSet(Model, filter, field, value) {
  //   const updatedDoc = await Model.findOneAndUpdate(
  //     filter,
  //     {
  //       $addToSet: {
  //         [field]: value,
  //       },
  //     },
  //     { new: true },
  //   );

  //   if (!updatedDoc) {
  //     throw new ApiError(500, `Failed to update ${field}`);
  //   }

  //   return updatedDoc;
  // }
  //Point 1
  const joinClass = await User.findOneAndUpdate(
    { _id: req.user._id },
    {
      $addToSet: {
        classesEnrolled: findClass._id,
      },
    },
  );

  if (!joinClass) {
    throw new ApiError(500, "Failed to join class");
  }
  //Point 2
  const updateClassStudents = await Class.findOneAndUpdate(
    { _id: findClass._id },
    {
      $addToSet: {
        students: req.user._id,
      },
    },
  );

  if (!updateClassStudents) {
    throw new ApiError(500, "Failed to add student to class list");
  }

  res.status(200).json({
    message: "Successfully joined class",
    classId: findClass.classId,
  });
});

const getMyClasses = asyncHandler(async (req, res) => {
  const userRole = req.user.role;

  if (userRole === "faculty") {
    const user = await User.findById(req.user._id).populate("classesTeaching");
    const ClassesTeaching = user?.classesTeaching || [];
    res.status(200).json({ ClassesTeaching });
  } else if (userRole === "student") {
    const user = await User.findById(req.user._id).populate({
      path: "classesEnrolled",
      populate: { path: "facultyId", select: "name email" },
    });
    const ClassesEnrolled = user?.classesEnrolled || [];
    res.status(200).json({ ClassesEnrolled });
  } else {
    throw new ApiError(403, "Unauthorized");
  }
});

const getClassDetails = asyncHandler(async (req, res) => {
  const { classId } = req.params;
  const classDetails = await Class.findOne({ classId })
    .populate("facultyid", "name email")
    .populate("students", "name email");
  // .populate("assignments"); --> activate this when we are done with assignment controller

  if (!classDetails) {
    throw new ApiError(404, "Class not found");
  }

  res.status(200).json({ classDetails });
});

const UpdateClass = asyncHandler(async (req, res) => {
  const { classId } = req.params;
  const { name } = req.body;

  if (req.user.role !== "faculty") {
    throw new ApiError(403, "Unauthorized");
  }

  if (!name?.trim()) {
    throw new ApiError(400, "Name is required to update class");
  }

  const classDoc = await Class.findOne({ classId });
  if (!classDoc) {
    throw new ApiError(404, "Class not found");
  }

  if (classDoc.facultyId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Only the faculty owner can update this class");
  }

  const updatedClass = await Class.findOneAndUpdate(
    { classId },
    { name: name.trim() },
    {
      new: true,
      runValidators: true,
    },
  );

  res.status(200).json({
    success: true,
    message: "Class updated successfully",
    data: updatedClass,
  });
});

const DeleteClass = asyncHandler(async (req, res) => {
  const { classId } = req.params;
  const classDoc = await Class.findOne({ classId });
  if (!classDoc) {
    throw new ApiError(404, "Class not found");
  }

  if (
    req.user.role !== "faculty" ||
    classDoc.facultyId.toString() !== req.user._id.toString()
  ) {
    throw new ApiError(403, "Unauthorized action");
  }

  const deleteClassFromList = await User.findByIdAndUpdate(classDoc.facultyId, {
    $pull: {
      classesTeaching: classDoc._id,
    },
  });
  if (!deleteClassFromList) {
    throw new ApiError(
      500,
      "Failed to delete class from faculty teaching list",
    );
  }

  await User.updateMany(
    { _id: { $in: classDoc.students } },
    {
      $pull: {
        classesEnrolled: classDoc._id,
      },
    },
  );

  const deleteClass = await Class.findByIdAndDelete(classDoc._id);
  if (!deleteClass) {
    throw new ApiError(500, "Failed to delete class");
  }

  res.status(200).json({ message: "Class deleted successfully" });
});

const LeaveClass = asyncHandler(async (req, res) => {
  const { classId } = req.params;

  // 1. Only students are allowed to leave a class
  if (req.user.role !== "student") {
    throw new ApiError(403, "Only students can leave a class");
  }

  // 2. Find the class using the human-readable classId
  const classDoc = await Class.findOne({ classId });

  if (!classDoc) {
    throw new ApiError(404, "Class not found");
  }

  // 3. Remove the class from the student's enrolled classes
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      $pull: {
        classesEnrolled: classDoc._id,
      },
    },
    { new: true },
  );

  if (!updatedUser) {
    throw new ApiError(500, "Failed to remove class from student profile");
  }

  // 4. Remove the student from the class's students array
  const updatedClass = await Class.findByIdAndUpdate(
    classDoc._id,
    {
      $pull: {
        students: req.user._id,
      },
    },
    { new: true },
  );

  if (!updatedClass) {
    throw new ApiError(500, "Failed to remove student from class");
  }

  // 5. Success response
  res.status(200).json({
    message: "Left class successfully",
  });
});

export {
  create,
  join,
  getMyClasses,
  getClassDetails,
  UpdateClass,
  DeleteClass,
  LeaveClass,
};
