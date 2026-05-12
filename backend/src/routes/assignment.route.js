import { Router } from "express";
import {
  createAssignment,
  deleteAssignment,
  updateAssignment,
  getAssignmentById,
  getAssignmentsByClass,
} from "../controllers/assignment.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/create").post(verifyJWT, createAssignment);
router.route("/update/:assId").put(verifyJWT, updateAssignment);
router.route("/delete/:assId").delete(verifyJWT, deleteAssignment);
router.route("/:assId").get(verifyJWT, getAssignmentById);
router.route("/:classId").get(verifyJWT, getAssignmentsByClass);

export default router;
