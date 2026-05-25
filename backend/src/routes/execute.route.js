import execute from "../controllers/execute.controller.js";
import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/run").post(verifyJWT, execute);

export default router;
