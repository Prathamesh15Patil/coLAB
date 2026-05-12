import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import bcrypt from "bcrypt";

//TODO: Role is opted by user, need to fix this else anyone can be faculty.
//need to show classes joined/created
//assignments complete or assigned

//above two need to be done after completeing class and assignment controllers

const tokenOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

//Auth Controllers
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, role, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(409, "User already exist, plz login instead");
  }

  if ([name, email, role, password].some((field) => !field?.trim())) {
    throw new ApiError(400, "All fields are required");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role,
  });

  const token = jwt.sign(
    {
      _id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    },
  );

  res.cookie("token", token, tokenOptions);

  const createdUser = await User.findById(user._id).select("-password");
  if (!createdUser) {
    throw new ApiError(500, "Failed to register user");
  }

  return res.status(201).json({
    message: "User created successfully",
    user: createdUser,
  });
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if ([email, password].some((field) => !field?.trim())) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, "User not found!!");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  const token = jwt.sign(
    {
      _id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    },
  );

  res.cookie("token", token, tokenOptions);

  const loggedInUser = await User.findById(user._id).select("-password");
  if (!loggedInUser) {
    throw new ApiError(500, "Failed to login user");
  }

  return res.status(200).json({
    success: true,
    message: "Logged in successfully",
    user: loggedInUser,
  });
});

const logoutUser = asyncHandler(async (req, res) => {
  res.clearCookie("token", tokenOptions);

  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

//profile controllers
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  return res.status(200).json({
    success: true,
    user,
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name && !email && !password) {
    throw new ApiError(400, "Enter fields to update");
  }

  const updatedData = {};
  if (name) updatedData.name = name;
  if (email) {
    const existingUser = await User.findOne({ email });

    if (existingUser && existingUser._id.toString() !== req.user._id) {
      throw new ApiError(409, "Email already in use");
    }
    updatedData.email = email;
  }
  if (password) updatedData.password = await bcrypt.hash(password, 10);

  const updatedUser = await User.findByIdAndUpdate(req.user._id, updatedData, {
    new: true,
  }).select("-password");

  if (!updatedUser) {
    throw new ApiError(500, "Failed to update profile");
  }

  return res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    user: updatedUser,
  });
});

export { registerUser, loginUser, logoutUser, getMe, updateProfile };
