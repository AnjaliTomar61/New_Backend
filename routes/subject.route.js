import express from "express";
import { createSubject, deleteSubject, listSubjects, updateSubject } from "../controllers/subject.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = express.Router();

router.get("/", requireAuth, asyncHandler(listSubjects));
router.post("/", requireAuth, requireRole("admin"), asyncHandler(createSubject));
router.put("/:id", requireAuth, requireRole("admin"), asyncHandler(updateSubject));
router.delete("/:id", requireAuth, requireRole("admin"), asyncHandler(deleteSubject));

export default router;

