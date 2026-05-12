import { Router } from "express";
import {
  create,
  join,
  getMyClasses,
  getClassDetails,
  UpdateClass,
  DeleteClass,
  LeaveClass,
} from "../controllers/class.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/create", verifyJWT, create);
router.post("/join", verifyJWT, join);

router.get("/my-classes", verifyJWT, getMyClasses);
router.get("/:classId", verifyJWT, getClassDetails);

router.put("/:classId", verifyJWT, UpdateClass);
router.delete("/:classId", verifyJWT, DeleteClass);

router.put("/:classId/leave", verifyJWT, LeaveClass);

export default router;
