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
import { requireAuth, requireRole } from "../middleware/auth.js";
const router = express.Router();

router.post("/create", requireAuth, requireRole("admin"), createCourse);
router.get("/all", requireAuth, getAllCourses);
router.get("/active", getActiveCourses);
router.put("/:id", requireAuth, requireRole("admin"), updateCourse);
router.delete("/:id", requireAuth, requireRole("admin"), deleteCourse);
router.patch("/toggle/:id", requireAuth, requireRole("admin"), toggleCourseStatus);

export default router;