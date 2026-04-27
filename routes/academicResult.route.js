import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  listMyResults,
  listFacultyMenteeResults,
  listAdminResults,
  createAdminResult,
  updateAdminResult,
  deleteAdminResult,
} from "../controllers/academicResult.controller.js";

const router = express.Router();

router.get("/me", requireAuth, requireRole("student"), asyncHandler(listMyResults));
router.get("/faculty", requireAuth, requireRole("faculty"), asyncHandler(listFacultyMenteeResults));

router.get("/admin", requireAuth, requireRole("admin"), asyncHandler(listAdminResults));
router.post("/admin", requireAuth, requireRole("admin"), asyncHandler(createAdminResult));
router.put("/admin/:id", requireAuth, requireRole("admin"), asyncHandler(updateAdminResult));
router.delete("/admin/:id", requireAuth, requireRole("admin"), asyncHandler(deleteAdminResult));

export default router;
