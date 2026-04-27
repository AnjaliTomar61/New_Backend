import express from "express";
import {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
   toggleDepartmentStatus,
} from "../controllers/department.controller.js";

const router = express.Router();

router.post("/create", createDepartment);
router.get("/all", getAllDepartments);
router.get("/:id", getDepartmentById);
router.put("/:id", updateDepartment);
router.delete("/:id", deleteDepartment);
router.patch("/toggle/:id", toggleDepartmentStatus);

export default router;