import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "../src/models/user.model.js";
import dotenv from "dotenv";

dotenv.config({
  path: "../.env",
});

const addFaculty = async () => {
  try {
    await mongoose.connect(process.env.DB_URL);
    //BEFORE ADDING NEW UPDATE THIS
    const facultyEmail = "faculty1@email.com";

    const existingFaculty = await User.findOne({
      email: facultyEmail,
    });

    if (existingFaculty) {
      console.log("Faculty already exists");
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash("12345", 10);
    //BEFORE ADDING NEW UPDATE THIS
    const faculty = await User.create({
      name: "faculty1",
      email: facultyEmail,
      password: hashedPassword,
      role: "faculty",
    });

    console.log("Faculty created successfully");
    console.log({
      id: faculty._id,
      name: faculty.name,
      email: faculty.email,
      role: faculty.role,
    });

    process.exit(0);
  } catch (error) {
    console.error("Failed to create faculty:", error);
    process.exit(1);
  }
};

addFaculty();
