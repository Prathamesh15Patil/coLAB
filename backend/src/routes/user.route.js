import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  getMe,
  updateProfile,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

//Auth routes
router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/profile").get(verifyJWT, getMe);
router.route("/profile").put(verifyJWT, updateProfile);
export default router;
