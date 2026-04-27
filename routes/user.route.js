import express from "express";
import { login, signup, getalluser, completeProfile } from "../controllers/user.controller.js";
import { getMyProfile, updateMyProfile } from "../controllers/profile.controller.js";
import {
  getAdminStudentAcademics,
  getFacultyAssignedStudents,
  getFacultyAssignedStudentDetail,
  putAdminStudentAcademic,
  putFacultyStudentAcademic,
  putAdminFacultyEmployment,
  getAdminFacultyPlacement,
  getAdminFacultyDirectoryDetail,
} from "../controllers/staffRecords.controller.js";
import { body } from "express-validator";
import { requireAuth, requireRole, requireSelfOrAdmin } from "../middleware/auth.js";

const router = express.Router();

function allowedSignupRoles() {
  const r = ["student", "faculty"];
  if (process.env.ALLOW_ADMIN_SIGNUP === "true") r.push("admin");
  return r;
}

router.post(
  "/signup",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("mobile").trim().notEmpty().withMessage("Mobile is required"),
    body("password").isLength({ min: 6 }).withMessage("Password min 6 chars"),
    body("role").custom((value) => {
      if (!allowedSignupRoles().includes(value)) {
        throw new Error(
          process.env.ALLOW_ADMIN_SIGNUP === "true"
            ? "Role must be student, faculty, or admin"
            : "Role must be student or faculty (admin signup disabled)"
        );
      }
      return true;
    }),
  ],
  signup
);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  login
);

router.get("/getalluser", requireAuth, requireRole("admin"), getalluser);

router.get("/admin/students-academic", requireAuth, requireRole("admin"), getAdminStudentAcademics);
router.put("/admin/students/:studentUserId/academic", requireAuth, requireRole("admin"), putAdminStudentAcademic);
router.get("/admin/faculty/:facultyUserId/placement", requireAuth, requireRole("admin"), getAdminFacultyPlacement);
router.get(
  "/admin/faculty/:facultyUserId/directory-detail",
  requireAuth,
  requireRole("admin"),
  getAdminFacultyDirectoryDetail
);
router.put("/admin/faculty/:facultyUserId/employment", requireAuth, requireRole("admin"), putAdminFacultyEmployment);

router.get("/faculty/assigned-students", requireAuth, requireRole("faculty"), getFacultyAssignedStudents);
router.get(
  "/faculty/students/:studentUserId/detail",
  requireAuth,
  requireRole("faculty"),
  getFacultyAssignedStudentDetail
);
router.put("/faculty/students/:studentUserId/academic", requireAuth, requireRole("faculty"), putFacultyStudentAcademic);

router.get("/me/profile", requireAuth, getMyProfile);
router.put("/me/profile", requireAuth, updateMyProfile);

router.put(
  "/completeprofile/:userId",
  requireAuth,
  requireSelfOrAdmin("userId"),
  completeProfile
);

export default router;
