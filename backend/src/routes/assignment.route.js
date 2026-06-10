import { Router } from "express";
import {
  createAssignment,
  deleteAssignment,
  updateAssignment,
  getAssignmentById,
  getAssignmentsByClass,
} from "../controllers/assignment.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { verifyFaculty } from "../middlewares/faculty.middleware.js";

const router = Router();

router.route("/create").post(verifyJWT, verifyFaculty, createAssignment);
router.route("/update/:assId").put(verifyJWT, verifyFaculty, updateAssignment);
router
  .route("/delete/:assId")
  .delete(verifyJWT, verifyFaculty, deleteAssignment);
router.route("/details/:assId").get(verifyJWT, getAssignmentById);
router.route("/class/:classId").get(verifyJWT, getAssignmentsByClass);

export default router;
