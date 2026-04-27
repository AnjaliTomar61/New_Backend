import mongoose from "mongoose";
import { user } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { validationResult } from "express-validator";

function serializeUser(doc) {
  if (!doc) return null;
  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    role: doc.role,
  };
}

function jwtForUser(doc) {
  const secret = process.env.JWT_ACCESS_SECRET || "dev_secret";
  const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN || "1d";
  return jwt.sign({ sub: doc._id.toString(), role: doc.role }, secret, { expiresIn });
}

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

    // Public signup: students & faculty only (admins provisioned separately)
    if (!["student", "faculty"].includes(role)) {
      return res.status(403).json({
        success: false,
        message: "Admin accounts cannot be created from this form. Contact IT.",
      });
    }

    const existing = await user.findOne({ email: String(email).toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const newuser = user({
      name,
      email: String(email).toLowerCase(),
      mobile,
      password: hashed,
      role,
    });
    await newuser.save();

    const token = jwtForUser(newuser);

    return res.status(201).json({
      message: "Account created successfully",
      success: true,
      token,
      user: serializeUser(newuser),
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

    const existingUser = await user
      .findOne({ email: String(email).toLowerCase() })
      .select("+password");

    if (!existingUser) {
      return res.status(401).json({
        message: "Invalid email or password",
        success: false,
      });
    }

    const ok = await bcrypt.compare(password, existingUser.password);
    if (!ok) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const token = jwtForUser(existingUser);

    return res.json({
      message: "Login successful",
      success: true,
      token,
      user: serializeUser(existingUser),
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
