import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  getMyTimetable,
  listTimetableBySemester,
  createTimetableSlot,
  updateTimetableSlot,
  deleteTimetableSlot,
} from "../controllers/timetable.controller.js";

const router = express.Router();

router.get("/me", requireAuth, asyncHandler(getMyTimetable));

router.get("/", requireAuth, requireRole("admin"), asyncHandler(listTimetableBySemester));
router.post("/", requireAuth, requireRole("admin"), asyncHandler(createTimetableSlot));
router.put("/:id", requireAuth, requireRole("admin"), asyncHandler(updateTimetableSlot));
router.delete("/:id", requireAuth, requireRole("admin"), asyncHandler(deleteTimetableSlot));

export default router;
