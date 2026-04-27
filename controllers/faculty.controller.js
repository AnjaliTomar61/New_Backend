// controllers/faculty.controller.js
import { Faculty } from "../models/faculty.model.js";
import { user } from "../models/user.model.js";
import { Department } from "../models/department.model.js";
import { FacultyProfile } from "../models/facultyProfile.model.js";
import { jwtForUser, serializeUser } from "../utils/authTokens.js";
import { migrateLegacyFacultyToPortalUser } from "../services/portalFaculty.js";
import { nextEmployeeId } from "../utils/idGenerator.js";

const DEFAULT_FACULTY_PASSWORD = process.env.DEFAULT_FACULTY_PASSWORD || "default123";

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// 🔐 Admin creates faculty (portal `user` + HR `Faculty` + `FacultyProfile`)
export const createFaculty = async (req, res) => {
  try {
    const { name, officialEmail, department, role } = req.body;
    const emailNorm = String(officialEmail || "")
      .toLowerCase()
      .trim();
    const departmentName = String(department || "").trim();
    const employeeIdInput = String(req.body.employeeId || "").trim();
    const mobile = String(req.body.mobile || "").trim();
    const passwordInput = req.body.password != null ? String(req.body.password) : "";

    let password;
    if (passwordInput.trim().length === 0) {
      password = String(DEFAULT_FACULTY_PASSWORD);
    } else if (passwordInput.length < 6) {
      return res.status(400).json({
        success: false,
        message: "When setting a password, use at least 6 characters",
      });
    } else {
      password = passwordInput;
    }

    const usedDefaultPassword = passwordInput.trim().length === 0;
    const employeeId = employeeIdInput || (await nextEmployeeId());

    if (!name || !emailNorm || !departmentName) {
      return res.status(400).json({
        success: false,
        message: "name, officialEmail, and department are required (employee ID is assigned automatically if omitted)",
      });
    }

    const existingUser = await user.findOne({ email: emailNorm });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "This email is already registered on the portal. Use a different official email or sign in with the existing account.",
      });
    }

    const existing = await Faculty.findOne({
      officialEmail: { $regex: new RegExp(`^${escapeRegex(emailNorm)}$`, "i") },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Faculty already exists",
      });
    }

    const portalUser = await user.create({
      name: String(name).trim(),
      email: emailNorm,
      mobile,
      password,
      role: "faculty",
    });

    try {
      const faculty = await Faculty.create({
        portalUser: portalUser._id,
        employeeId: String(employeeId).trim(),
        officialEmail: emailNorm,
        departmentName,
        designation: role || "Lecturer",
        password,
      });

      const deptDoc = await Department.findOne({
        name: new RegExp(`^${departmentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
      });

      await FacultyProfile.findOneAndUpdate(
        { user: portalUser._id },
        {
          $set: {
            user: portalUser._id,
            employeeId: String(employeeId).trim(),
            designation: role || "Lecturer",
            ...(deptDoc && { department: deptDoc._id }),
          },
        },
        { upsert: true, new: true, runValidators: true }
      );

      const facultyOut = await Faculty.findById(faculty._id).select("-password");

      return res.status(201).json({
        success: true,
        message: usedDefaultPassword
          ? "Faculty created. They can sign in with their official email and the default password (change after first login)."
          : "Faculty created. They can sign in with their official email and the password you set.",
        faculty: facultyOut,
        portal: {
          email: emailNorm,
          employeeId,
          ...(usedDefaultPassword ? { defaultPassword: DEFAULT_FACULTY_PASSWORD } : { passwordSetByAdmin: true }),
        },
      });
    } catch (inner) {
      await user.findByIdAndDelete(portalUser._id);
      throw inner;
    }
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate employee id or email.",
      });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 🔑 Login (same JWT as /api/v1/user/login — use official email as portal email)
export const loginFaculty = async (req, res) => {
  try {
    const { officialEmail, password } = req.body;
    const emailNorm = String(officialEmail || "")
      .toLowerCase()
      .trim();

    if (!emailNorm || password == null || password === "") {
      return res.status(400).json({
        success: false,
        message: "officialEmail and password are required",
      });
    }

    let portalUser = await user.findOne({ email: emailNorm }).select("+password");

    if (!portalUser) {
      portalUser = await migrateLegacyFacultyToPortalUser(emailNorm, password);
    }

    if (!portalUser || portalUser.role !== "faculty") {
      return res.status(401).json({
        success: false,
        message: "Faculty not found or invalid credentials",
      });
    }

    if (String(password) !== String(portalUser.password)) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = jwtForUser(portalUser);
    const userOut = serializeUser(portalUser);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      role: userOut.role,
      user: userOut,
      data: { token, role: userOut.role, user: userOut },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 👤 Get Profile (legacy route — expects req.user from auth; prefer /api/v1/user/me/profile)
export const getProfile = async (req, res) => {
  try {
    const faculty = await Faculty.findById(req.user.id).select("-password");

    res.status(200).json({
      success: true,
      faculty,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✏️ Update Profile (legacy)
export const updateProfile = async (req, res) => {
  try {
    const updates = req.body;

    const faculty = await Faculty.findByIdAndUpdate(req.user.id, updates, { new: true }).select("-password");

    res.status(200).json({
      success: true,
      message: "Profile updated",
      faculty,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🗑️ Delete Faculty (Admin) — removes legacy row and matching portal account when linked by email
export const deleteFaculty = async (req, res) => {
  try {
    const fac = await Faculty.findById(req.params.id);
    if (!fac) {
      return res.status(404).json({ success: false, message: "Faculty not found" });
    }

    const emailNorm = String(fac.officialEmail || "").toLowerCase().trim();
    let portal = null;
    if (fac.portalUser) {
      portal = await user.findById(fac.portalUser);
    }
    if (!portal && emailNorm) {
      portal = await user.findOne({ email: emailNorm, role: "faculty" });
    }
    if (portal) {
      await FacultyProfile.deleteMany({ user: portal._id });
      await user.deleteOne({ _id: portal._id });
    }
    await Faculty.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Faculty deleted",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
