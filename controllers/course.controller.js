// controllers/course.controller.js

import { Course } from "../models/course.model.js";


// ➕ Create Course
export const createCourse = async (req, res) => {
  try {
    const course = await Course.create(req.body);

    res.status(201).json({
      success: true,
      message: "Course created",
      course,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// 📄 Get All Courses (Admin)
export const getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find()
      .populate("department", "name code")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      courses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// 👤 Get Active Courses (User)
export const getActiveCourses = async (req, res) => {
  try {
    const courses = await Course.find({ isActive: true })
      .populate("department", "name code");

    res.status(200).json({
      success: true,
      courses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// 🔄 Toggle Course Status (Active/Inactive)
export const toggleCourseStatus = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    course.isActive = !course.isActive;
    await course.save();

    res.status(200).json({
      success: true,
      message: "Course status updated",
      course,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ✏️ Update Course
export const updateCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Course updated",
      course,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// ❌ Delete Course
export const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Course deleted",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};