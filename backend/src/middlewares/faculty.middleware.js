import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";

export const verifyFaculty = (req, res, next) => {
  {
    if (req.user.role !== "faculty") {
      throw new ApiError(403, "Operation only authorized for faculty!");
    }

    next();
  }
};
