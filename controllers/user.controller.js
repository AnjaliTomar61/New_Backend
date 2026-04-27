import mongoose from "mongoose";
import { user } from "../models/user.model.js";
import { validationResult } from "express-validator";
import { jwtForUser, serializeUser } from "../utils/authTokens.js";
import { migrateLegacyFacultyToPortalUser } from "../services/portalFaculty.js";
import { FacultyProfile } from "../models/facultyProfile.model.js";
import { StudentProfile } from "../models/studentProfile.model.js";
import { nextEnrollmentNo } from "../utils/idGenerator.js";

export const signup = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { name, email, mobile, password, role } = req.body;

    if (!name || !email || !mobile || !password || !role) {
      return res.status(400).json({
        message: "All fields are required",
        success: false,
      });
    }

    const allowedRoles = ["student", "faculty"];
    if (process.env.ALLOW_ADMIN_SIGNUP === "true") {
      allowedRoles.push("admin");
    }
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        message:
          "Invalid role. Student and faculty may self-register; admin only when ALLOW_ADMIN_SIGNUP=true.",
      });
    }

    const existing = await user.findOne({ email: String(email).toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: "Email already registered" });
    }

    const newuser = user({
      name,
      email: String(email).toLowerCase(),
      mobile,
      password: String(password),
      role,
    });
    await newuser.save();

    if (role === "faculty") {
      await FacultyProfile.findOneAndUpdate(
        { user: newuser._id },
        { $setOnInsert: { user: newuser._id, designation: "Lecturer", isActive: true } },
        { upsert: true }
      );
    } else if (role === "student") {
      const enrollmentNo = await nextEnrollmentNo();
      await StudentProfile.findOneAndUpdate(
        { user: newuser._id },
        { $setOnInsert: { user: newuser._id, admissionStatus: "pending", enrollmentNo } },
        { upsert: true }
      );
    }

    const token = jwtForUser(newuser);
    const userOut = serializeUser(newuser);

    return res.status(201).json({
      message: "Account created successfully",
      success: true,
      token,
      role: userOut.role,
      user: userOut,
      data: { token, role: userOut.role, user: userOut },
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: "Email already registered" });
    }
    console.error("signup", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
        success: false,
      });
    }

    const emailNorm = String(email).toLowerCase().trim();

    let existingUser = await user.findOne({ email: emailNorm }).select("+password");

    if (!existingUser) {
      existingUser = await migrateLegacyFacultyToPortalUser(emailNorm, password);
    }

    if (!existingUser) {
      return res.status(401).json({
        message: "Invalid email or password",
        success: false,
      });
    }

    if (String(password) !== String(existingUser.password)) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const token = jwtForUser(existingUser);
    const userOut = serializeUser(existingUser);

    return res.json({
      message: "Login successful",
      success: true,
      token,
      role: userOut.role,
      user: userOut,
      /** Same auth payload nested for clients that only read `response.data.data` */
      data: { token, role: userOut.role, user: userOut },
    });
  } catch (error) {
    console.error("login", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getalluser = async (req, res) => {
  try {
    const alluser = await user.find().select("-password");
    if (alluser.length <= 0) {
      return res.json({
        message: "No users found",
        success: false,
        data: [],
      });
    }
    return res.json({
      message: "Users retrieved successfully",
      data: alluser,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      success: false,
      error: error.message,
    });
  }
};

export const completeProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }

    const existingUser = await user.findById(userId);
    if (!existingUser) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    const forbidden = ["password", "role", "email"];
    const body = { ...req.body };
    for (const k of forbidden) delete body[k];

    Object.assign(existingUser, body);
    await existingUser.save();

    return res.json({
      message: "Profile updated successfully",
      success: true,
      data: serializeUser(existingUser),
    });
  } catch (error) {
    console.error("completeProfile", error);
    return res.status(500).json({
      message: "Server error",
      success: false,
      error: error.message,
    });
  }
};
