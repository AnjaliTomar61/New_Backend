import express from "express";
import { createSemester, deleteSemester, listSemesters, updateSemester } from "../controllers/semester.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = express.Router();

router.get("/", requireAuth, asyncHandler(listSemesters));
router.post("/", requireAuth, requireRole("admin"), asyncHandler(createSemester));
router.put("/:id", requireAuth, requireRole("admin"), asyncHandler(updateSemester));
router.delete("/:id", requireAuth, requireRole("admin"), asyncHandler(deleteSemester));

export default router;

