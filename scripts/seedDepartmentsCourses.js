/**
 * Seed demo departments, courses, and semesters for local / QA data.
 * Uses stable codes prefixed with SEED_ so re-runs replace the same catalog rows.
 *
 * Run before seed:users so faculty/student profiles can link to catalog IDs:
 *   npm run seed:programs
 *   npm run seed:users
 *
 * Usage:
 *   node scripts/seedDepartmentsCourses.js
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { Department } from "../models/department.model.js";
import { Course } from "../models/course.model.js";
import { Semester } from "../models/semester.model.js";
import { Subject } from "../models/subject.model.js";

dotenv.config();

/** Department rows recreated on each run (by code). */
const SEED_DEPARTMENTS = [
  { name: "Computer Science", code: "SEED_CS", description: "Demo catalog — Computer Science" },
  { name: "Computer Application", code: "SEED_CA", description: "Demo catalog — Computer Application" },
  { name: "Law", code: "SEED_LAW", description: "Demo catalog — Law" },
];

/** courseCode must stay unique; departmentCode matches SEED_DEPARTMENTS[].code */
const SEED_COURSES = [
  {
    courseName: "Bachelor of Computer Applications",
    courseCode: "SEED_BCA",
    departmentCode: "SEED_CA",
    duration: "3 years",
    totalSemesters: 6,
    fees: 45000,
    description: "Demo program (seed)",
    eligibility: "10+2",
  },
  {
    courseName: "B.Sc. Computer Science",
    courseCode: "SEED_BSC_CS",
    departmentCode: "SEED_CS",
    duration: "3 years",
    totalSemesters: 6,
    fees: 52000,
    description: "Demo program (seed)",
    eligibility: "10+2 with Mathematics",
  },
  {
    courseName: "LL.B. (3 Year)",
    courseCode: "SEED_LLB",
    departmentCode: "SEED_LAW",
    duration: "3 years",
    totalSemesters: 6,
    fees: 60000,
    description: "Demo program (seed)",
    eligibility: "10+2",
  },
];

async function removePreviousSeedCatalog() {
  const deptCodes = SEED_DEPARTMENTS.map((d) => d.code);
  const courseCodes = SEED_COURSES.map((c) => c.courseCode);

  const existingCourses = await Course.find({ courseCode: { $in: courseCodes } }).select("_id").lean();
  const courseIds = existingCourses.map((c) => c._id);

  if (courseIds.length) {
    const delSem = await Semester.deleteMany({ course: { $in: courseIds } });
    const delSub = await Subject.deleteMany({ course: { $in: courseIds } });
    console.log("[seed:programs] removed semesters:", delSem.deletedCount, "subjects:", delSub.deletedCount);
  }

  const delCourses = await Course.deleteMany({ courseCode: { $in: courseCodes } });
  const delDepts = await Department.deleteMany({ code: { $in: deptCodes } });

  console.log("[seed:programs] removed courses:", delCourses.deletedCount, "departments:", delDepts.deletedCount);
}

async function main() {
  console.log("[seed:programs] starting…");
  await connectDB();
  await removePreviousSeedCatalog();

  const createdDepts = [];
  for (const d of SEED_DEPARTMENTS) {
    const doc = await Department.create({ ...d, isActive: true });
    createdDepts.push(doc);
    console.log("[seed:programs] department:", doc.code, doc.name);
  }

  const byCode = new Map(createdDepts.map((d) => [d.code, d]));

  for (const c of SEED_COURSES) {
    const dep = byCode.get(c.departmentCode);
    if (!dep) {
      console.warn("[seed:programs] skip course (unknown departmentCode):", c.courseCode);
      continue;
    }
    const doc = await Course.create({
      courseName: c.courseName,
      courseCode: c.courseCode,
      department: dep._id,
      duration: c.duration,
      totalSemesters: c.totalSemesters,
      fees: c.fees,
      description: c.description,
      eligibility: c.eligibility,
      isActive: true,
    });
    console.log("[seed:programs] course:", doc.courseCode, "→", dep.name);

    const count = Math.min(Math.max(1, Number(doc.totalSemesters) || 6), 12);
    for (let num = 1; num <= count; num += 1) {
      await Semester.create({
        course: doc._id,
        number: num,
        title: `Semester ${num}`,
        isActive: true,
      });
    }
    console.log("[seed:programs]   semesters 1–" + count + " for", doc.courseCode);
  }

  console.log("\n[seed:programs] done. Run: npm run seed:users");
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed:programs] failed:", err?.message || err);
  process.exit(1);
});
