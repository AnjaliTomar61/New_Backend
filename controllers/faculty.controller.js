// controllers/faculty.controller.js
import { Faculty } from "../models/faculty.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";


// 🔐 Admin creates faculty
export const createFaculty = async (req, res) => {
  try {
    const { employeeId, name, officialEmail, department, role } = req.body;

    const existing = await Faculty.findOne({ officialEmail });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Faculty already exists",
      });
    }

    const hashedPassword = await bcrypt.hash("default123", 10);

    const faculty = await Faculty.create({
      employeeId,
      name,
      officialEmail,
      department,
      role,
      password: hashedPassword,
    });

    res.status(201).json({
      success: true,
      message: "Faculty created successfully",
      faculty,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// 🔑 Login
export const loginFaculty = async (req, res) => {
  try {
    const { officialEmail, password } = req.body;

    const faculty = await Faculty.findOne({ officialEmail });
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty not found",
      });
    }

    const isMatch = await bcrypt.compare(password, faculty.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      { id: faculty._id, role: "faculty" },
      "secretkey",
      { expiresIn: "1d" }
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      faculty,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// 👤 Get Profile
export const getProfile = async (req, res) => {
  try {
    const faculty = await Faculty.findById(req.user.id).select("-password");

    res.status(200).json({
      success: true,
      faculty,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// ✏️ Update Profile (Faculty editable fields only)
export const updateProfile = async (req, res) => {
  try {
    const updates = req.body;

    const faculty = await Faculty.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true }
    ).select("-password");

    res.status(200).json({
      success: true,
      message: "Profile updated",
      faculty,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// 🗑️ Delete Faculty (Admin)
export const deleteFaculty = async (req, res) => {
  try {
    await Faculty.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Faculty deleted",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};