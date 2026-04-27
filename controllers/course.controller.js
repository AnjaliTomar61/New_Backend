// controllers/course.controller.js

import mongoose from "mongoose";
import { Course } from "../models/course.model.js";
import { Department } from "../models/department.model.js";

// ➕ Create Course
export const createCourse = async (req, res) => {
  try {
    const b = req.body && typeof req.body === "object" ? req.body : {};
    const {
      courseName,
      courseCode,
      department,
      duration,
      totalSemesters,
      fees,
      description,
      eligibility,
      isActive,
    } = b;

    if (!courseName || !courseCode || !department || !duration) {
      return res.status(400).json({
        success: false,
        message: "courseName, courseCode, department (id), and duration are required",
      });
    }
    if (!mongoose.isValidObjectId(department)) {
      return res.status(400).json({ success: false, message: "Invalid department id" });
    }
    const deptExists = await Department.findById(department).select("_id");
    if (!deptExists) {
      return res.status(400).json({ success: false, message: "Department not found" });
    }

    const sem = Number(totalSemesters);
    const feeNum = Number(fees);
    if (!Number.isFinite(sem) || sem < 1) {
      return res.status(400).json({
        success: false,
        message: "totalSemesters must be a number ≥ 1",
      });
    }
    if (!Number.isFinite(feeNum) || feeNum < 0) {
      return res.status(400).json({
        success: false,
        message: "fees must be a number ≥ 0",
      });
    }

    const course = await Course.create({
      courseName: String(courseName).trim(),
      courseCode: String(courseCode).trim(),
      department,
      duration: String(duration).trim(),
      totalSemesters: sem,
      fees: feeNum,
      description: description != null ? String(description) : undefined,
      eligibility: eligibility != null ? String(eligibility) : undefined,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    const populated = await Course.findById(course._id).populate("department", "name code");

    res.status(201).json({
      success: true,
      message: "Course created",
      course: populated,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: "Course code already exists" });
    }
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


const COURSE_UPDATE_FIELDS = [
  "courseName",
  "courseCode",
  "department",
  "duration",
  "totalSemesters",
  "fees",
  "description",
  "eligibility",
  "isActive",
];

// ✏️ Update Course
export const updateCourse = async (req, res) => {
  try {
    const b = req.body && typeof req.body === "object" ? req.body : {};
    const set = {};
    for (const k of COURSE_UPDATE_FIELDS) {
      if (b[k] !== undefined) set[k] = b[k];
    }
    if (set.department != null && !mongoose.isValidObjectId(set.department)) {
      return res.status(400).json({ success: false, message: "Invalid department id" });
    }
    if (set.department != null) {
      const deptExists = await Department.findById(set.department).select("_id");
      if (!deptExists) {
        return res.status(400).json({ success: false, message: "Department not found" });
      }
    }
    if (set.totalSemesters != null) {
      const sem = Number(set.totalSemesters);
      if (!Number.isFinite(sem) || sem < 1) {
        return res.status(400).json({ success: false, message: "totalSemesters must be ≥ 1" });
      }
      set.totalSemesters = sem;
    }
    if (set.fees != null) {
      const feeNum = Number(set.fees);
      if (!Number.isFinite(feeNum) || feeNum < 0) {
        return res.status(400).json({ success: false, message: "fees must be ≥ 0" });
      }
      set.fees = feeNum;
    }

    const course = await Course.findByIdAndUpdate(req.params.id, set, { new: true, runValidators: true }).populate(
      "department",
      "name code"
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
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: "Duplicate course code" });
    }
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