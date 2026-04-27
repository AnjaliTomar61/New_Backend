import express from "express";
import {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
   toggleDepartmentStatus,
} from "../controllers/department.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

router.post("/create", requireAuth, requireRole("admin"), createDepartment);
router.get("/all", requireAuth, getAllDepartments);
router.get("/:id", getDepartmentById);
router.put("/:id", requireAuth, requireRole("admin"), updateDepartment);
router.delete("/:id", requireAuth, requireRole("admin"), deleteDepartment);
router.patch("/toggle/:id", requireAuth, requireRole("admin"), toggleDepartmentStatus);

export default router;