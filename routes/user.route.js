import express from "express";
import { login, signup, getalluser,  completeProfile } from "../controllers/user.controller.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login",login);
router.get("/getalluser",getalluser);
router.put("/completeprofile/:userId", completeProfile);

export default router;  