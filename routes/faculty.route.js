// routes/faculty.route.js
import express from "express";
import {
  createFaculty,
  loginFaculty,
  getProfile,
  updateProfile,
  deleteFaculty,
} from "../controllers/faculty.controller.js";

const router = express.Router();

router.post("/create", createFaculty);   // admin
router.post("/login", loginFaculty);     // faculty

router.get("/profile", getProfile);
router.put("/update-profile", updateProfile);

router.delete("/:id", deleteFaculty);    // admin

export default router;