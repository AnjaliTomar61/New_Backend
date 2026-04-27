// routes/course.route.js
import express from "express";

import {
  createCourse,
  getAllCourses,
  getActiveCourses,
  updateCourse,
  deleteCourse,
  toggleCourseStatus, // ✅ add this
} from "../controllers/course.controller.js";
const router = express.Router();

router.post("/create", createCourse);
router.get("/all", getAllCourses);
router.put("/:id", updateCourse);
router.delete("/:id", deleteCourse);
router.patch("/toggle/:id", toggleCourseStatus);

export default router;