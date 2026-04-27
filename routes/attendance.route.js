import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  postAttendanceTap,
  getAttendanceToday,
  getMyAttendanceWeek,
  getAdminAttendanceMatrix,
} from "../controllers/attendance.controller.js";

const router = express.Router();

router.post("/tap", requireAuth, asyncHandler(postAttendanceTap));
router.get("/me/today", requireAuth, asyncHandler(getAttendanceToday));
router.get("/me/week", requireAuth, asyncHandler(getMyAttendanceWeek));

router.get("/admin/matrix", requireAuth, requireRole("admin"), asyncHandler(getAdminAttendanceMatrix));

export default router;
