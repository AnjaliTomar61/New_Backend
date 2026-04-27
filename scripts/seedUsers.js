/**
 * Seed demo users: 1 admin, 6 faculty, 15 students (+ profiles, HR rows where applicable).
 * Re-run: removes any existing users with emails ending in @seed.demo, matching profiles, and linked Faculty HR rows.
 *
 * Recommended order:
 *   1. npm run seed:programs   (departments + courses — scripts/seedDepartmentsCourses.js)
 *   2. npm run seed:users      (this file)
 *
 * Uses the same ID generators as the app (employee IDs, enrollment numbers) when seed catalog exists.
 * Login password for every seeded account: Seedpass123
 *
 * Usage:
 *   npm run seed:users
 *   node scripts/seedUsers.js
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { user } from "../models/user.model.js";
import { StudentProfile } from "../models/studentProfile.model.js";
import { FacultyProfile } from "../models/facultyProfile.model.js";
import { AdminProfile } from "../models/adminProfile.model.js";
import { Faculty } from "../models/faculty.model.js";
import { Department } from "../models/department.model.js";
import { Course } from "../models/course.model.js";
import { nextEmployeeId, nextEnrollmentNo } from "../utils/idGenerator.js";

dotenv.config();

const SEED_EMAIL_DOMAIN = "@seed.demo";
const DEFAULT_PASSWORD = "Seedpass123";

const STUDENT_COUNT = 15;
const FACULTY_COUNT = 6;

const SEED_DEPT_CODES = ["SEED_CS", "SEED_CA", "SEED_LAW"];
const SEED_COURSE_CODES = ["SEED_BCA", "SEED_BSC_CS", "SEED_LLB"];

async function removePreviousSeed() {
  const existing = await user
    .find({ email: new RegExp(`${SEED_EMAIL_DOMAIN.replace(".", "\\.")}$`, "i") })
    .select("_id email");
  const ids = existing.map((u) => u._id);
  if (ids.length === 0) {
    console.log("[seed] no previous @seed.demo users to remove");
    return;
  }

  await Faculty.deleteMany({
    $or: [{ portalUser: { $in: ids } }, { officialEmail: new RegExp(`${SEED_EMAIL_DOMAIN.replace(".", "\\.")}$`, "i") }],
  });
  await StudentProfile.deleteMany({ user: { $in: ids } });
  await FacultyProfile.deleteMany({ user: { $in: ids } });
  await AdminProfile.deleteMany({ user: { $in: ids } });
  await user.deleteMany({ _id: { $in: ids } });
  console.log("[seed] removed", ids.length, "previous seed user(s) + linked Faculty HR rows");
}

function pad(n, w = 2) {
  return String(n).padStart(w, "0");
}

function pickFacultyDept(seedDepts, index1Based) {
  if (!seedDepts.length) return null;
  const code = SEED_DEPT_CODES[(index1Based - 1) % SEED_DEPT_CODES.length];
  return seedDepts.find((d) => d.code === code) || seedDepts[(index1Based - 1) % seedDepts.length];
}

function pickStudentCourse(seedCourses, index1Based) {
  if (!seedCourses.length) return null;
  return seedCourses[(index1Based - 1) % seedCourses.length];
}

async function main() {
  console.log("[seed] starting…");
  await connectDB();
  await removePreviousSeed();

  const seedDepts = await Department.find({ code: { $in: SEED_DEPT_CODES } }).lean();
  const seedCourses = await Course.find({ courseCode: { $in: SEED_COURSE_CODES } })
    .populate("department")
    .lean();

  if (seedDepts.length === 0) {
    console.warn("[seed] no SEED_* departments found — run `npm run seed:programs` first for linked catalog data.");
  } else {
    console.log("[seed] linked catalog:", seedDepts.length, "department(s),", seedCourses.length, "course(s)");
  }

  // --- Admin (1) ---
  const adminDoc = await user.create({
    name: "Seed Admin",
    email: `admin${SEED_EMAIL_DOMAIN}`,
    mobile: "9000000000",
    password: DEFAULT_PASSWORD,
    role: "admin",
    gender: "other",
  });
  await AdminProfile.create({
    user: adminDoc._id,
    jobTitle: "System Administrator",
    displayTitle: "Campus Admin",
  });
  console.log("[seed] admin:", adminDoc.email);

  const designations = ["Lecturer", "Assistant Professor", "Professor"];

  // --- Faculty (6) ---
  const facultyDocs = [];
  for (let i = 1; i <= FACULTY_COUNT; i++) {
    const f = await user.create({
      name: `Seed Faculty ${i}`,
      email: `faculty${pad(i)}${SEED_EMAIL_DOMAIN}`,
      mobile: `910000${pad(i, 4)}`,
      password: DEFAULT_PASSWORD,
      role: "faculty",
      gender: i % 2 === 0 ? "female" : "male",
    });
    facultyDocs.push(f);

    const designation = designations[i % 3];
    const deptDoc = pickFacultyDept(seedDepts, i);
    const employeeId = await nextEmployeeId();

    await FacultyProfile.create({
      user: f._id,
      employeeId,
      designation,
      department: deptDoc?._id || undefined,
      isActive: true,
    });

    await Faculty.create({
      portalUser: f._id,
      employeeId,
      officialEmail: String(f.email).toLowerCase(),
      departmentName: deptDoc?.name || "Computer Science",
      designation,
      password: DEFAULT_PASSWORD,
    });

    console.log("[seed] faculty:", f.email, employeeId, deptDoc ? `(${deptDoc.code})` : "(no catalog dept)");
  }

  const primaryMentorId = facultyDocs[0]._id;

  // --- Students (15) ---
  for (let i = 1; i <= STUDENT_COUNT; i++) {
    const s = await user.create({
      name: `Seed Student ${i}`,
      email: `student${pad(i)}${SEED_EMAIL_DOMAIN}`,
      mobile: `920000${pad(i, 4)}`,
      password: DEFAULT_PASSWORD,
      role: "student",
      gender: ["male", "female", "other"][i % 3],
    });
    const assignedFaculty = i <= 8 ? primaryMentorId : null;
    const courseDoc = pickStudentCourse(seedCourses, i);
    let depId;
    if (courseDoc?.department && typeof courseDoc.department === "object" && courseDoc.department._id) {
      depId = courseDoc.department._id;
    } else if (courseDoc?.department && mongoose.isValidObjectId(courseDoc.department)) {
      depId = courseDoc.department;
    }
    const courseId = courseDoc?._id || undefined;
    const enrollmentNo = await nextEnrollmentNo();

    await StudentProfile.create({
      user: s._id,
      enrollmentNo,
      admissionStatus: i % 5 === 0 ? "approved" : "pending",
      assignedFaculty,
      ...(depId ? { department: depId } : {}),
      ...(courseId ? { course: courseId } : {}),
    });
    console.log("[seed] student:", s.email, assignedFaculty ? "(mentor: faculty01)" : "", enrollmentNo);
  }

  console.log("\n[seed] done.");
  console.log("  Accounts:", 1 + FACULTY_COUNT + STUDENT_COUNT);
  console.log("  Password (all):", DEFAULT_PASSWORD);
  console.log("  Admin login:   admin" + SEED_EMAIL_DOMAIN);
  console.log("  Faculty login: faculty01" + SEED_EMAIL_DOMAIN, "… faculty06" + SEED_EMAIL_DOMAIN);
  console.log("  Student login: student01" + SEED_EMAIL_DOMAIN, "… student15" + SEED_EMAIL_DOMAIN);
  if (seedDepts.length === 0) {
    console.log("\n[seed] tip: run `npm run seed:programs` then re-run `npm run seed:users` to attach dept/course/HR data.");
  }
  console.log("\n[seed] disconnecting.");
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed] failed:", err?.message || err);
  process.exit(1);
});
