import express from "express";
import { login, signup, getalluser, completeProfile } from "../controllers/user.controller.js";
import { body } from "express-validator";
import { requireAuth, requireRole, requireSelfOrAdmin } from "../middleware/auth.js";

const router = express.Router();

router.post(
  "/signup",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("mobile").trim().notEmpty().withMessage("Mobile is required"),
    body("password").isLength({ min: 6 }).withMessage("Password min 6 chars"),
    body("role")
      .isIn(["student", "faculty"])
      .withMessage("Role must be student or faculty"),
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

router.put(
  "/completeprofile/:userId",
  requireAuth,
  requireSelfOrAdmin("userId"),
  completeProfile
);

export default router;
