/**
 * Seed demo timetable slots and results for the seeded catalog/users.
 *
 * Recommended order:
 *   1) npm run seed:programs   (departments/courses/semesters/subjects)
 *   2) npm run seed:users      (admin/faculty/students + profiles)
 *   3) npm run seed:academics  (this file)
 *
 * Re-run safe: removes previous seeded timetable slots/results for SEED_* catalog and @seed.demo users.
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { Course } from "../models/course.model.js";
import { Semester } from "../models/semester.model.js";
import { Subject } from "../models/subject.model.js";
import { TimetableSlot } from "../models/timetableSlot.model.js";
import { AcademicResult } from "../models/academicResult.model.js";
import { user as User } from "../models/user.model.js";
import { StudentProfile } from "../models/studentProfile.model.js";

dotenv.config();

const SEED_EMAIL_DOMAIN = "@seed.demo";
const SEED_COURSE_CODES = ["SEED_BCA", "SEED_BSC_CS", "SEED_LLB"];

function pad2(n) {
  return String(n).padStart(2, "0");
}

async function removePreviousSeedAcademicData(seedSemesterIds, seedStudentIds) {
  const [delSlots, delResults] = await Promise.all([
    TimetableSlot.deleteMany({ semester: { $in: seedSemesterIds } }),
    AcademicResult.deleteMany({ student: { $in: seedStudentIds }, semester: { $in: seedSemesterIds } }),
  ]);
  console.log("[seed:academics] removed timetable slots:", delSlots.deletedCount, "results:", delResults.deletedCount);
}

async function assignFacultyToSubjects(subjects) {
  const facultyUsers = await User.find({
    role: "faculty",
    email: new RegExp(`${SEED_EMAIL_DOMAIN.replace(".", "\\.")}$`, "i"),
  })
    .select("_id email")
    .sort({ email: 1 })
    .lean();

  if (!facultyUsers.length) {
    console.warn("[seed:academics] no seeded faculty found to assign subjects. Run `npm run seed:users` first.");
    return;
  }

  for (let i = 0; i < subjects.length; i += 1) {
    const fac = facultyUsers[i % facultyUsers.length];
    await Subject.updateOne({ _id: subjects[i]._id }, { $set: { faculty: fac._id } });
  }
  console.log("[seed:academics] assigned faculty to", subjects.length, "subject(s)");
}

async function seedTimetableForSemester(semesterId) {
  const subs = await Subject.find({ semester: semesterId }).select("_id").lean();
  if (!subs.length) return 0;

  const days = ["mon", "tue", "wed", "thu", "fri"];
  const startTimes = ["09:00", "10:00", "11:00"];
  let created = 0;

  for (let d = 0; d < days.length; d += 1) {
    for (let t = 0; t < startTimes.length; t += 1) {
      const idx = (d * startTimes.length + t) % subs.length;
      const st = startTimes[t];
      const endH = Number(st.slice(0, 2)) + 1;
      const et = `${pad2(endH)}:${st.slice(3, 5)}`;
      await TimetableSlot.create({
        semester: semesterId,
        subject: subs[idx]._id,
        day: days[d],
        startTime: st,
        endTime: et,
        room: `Room ${10 + t}`,
        note: "",
      });
      created += 1;
    }
  }
  return created;
}

async function seedResultsForStudents(seedSemesterId, subjectDocs, students) {
  let created = 0;
  const lines = (subjectDocs || []).slice(0, 4).map((s, i) => ({
    subject: s._id,
    subjectLabel: "",
    maxMarks: 100,
    obtained: 65 + (i * 5),
    grade: ["B", "B+", "A", "A+"][i] || "",
  }));

  for (let i = 0; i < students.length; i += 1) {
    await AcademicResult.create({
      student: students[i]._id,
      semester: seedSemesterId,
      examTitle: "Mid Term (Seed)",
      published: true,
      lines,
      remarks: "Seeded demo marks",
    });
    created += 1;
  }
  return created;
}

async function main() {
  console.log("[seed:academics] starting…");
  await connectDB();

  const seedCourses = await Course.find({ courseCode: { $in: SEED_COURSE_CODES } }).select("_id courseCode").lean();
  if (!seedCourses.length) {
    console.warn("[seed:academics] no SEED_* courses found. Run `npm run seed:programs` first.");
    await mongoose.disconnect();
    process.exit(0);
  }

  // Use only semester 1 for each seeded course for demo
  const seedSemesters = await Semester.find({
    course: { $in: seedCourses.map((c) => c._id) },
    number: 1,
  })
    .select("_id course number")
    .lean();

  const seedStudents = await User.find({
    role: "student",
    email: new RegExp(`${SEED_EMAIL_DOMAIN.replace(".", "\\.")}$`, "i"),
  })
    .select("_id email")
    .sort({ email: 1 })
    .limit(8)
    .lean();

  // Make sure seeded students have currentSemester set (so timetable/me works for them)
  if (seedStudents.length && seedSemesters.length) {
    for (let i = 0; i < seedStudents.length; i += 1) {
      const sem = seedSemesters[i % seedSemesters.length];
      await StudentProfile.updateOne({ user: seedStudents[i]._id }, { $set: { currentSemester: sem._id } });
    }
    console.log("[seed:academics] set currentSemester for", seedStudents.length, "seed student profile(s)");
  }

  await removePreviousSeedAcademicData(
    seedSemesters.map((s) => s._id),
    seedStudents.map((s) => s._id)
  );

  // Assign seeded faculty to seeded subjects (so faculty timetable/me works)
  const seedSubjects = await Subject.find({ course: { $in: seedCourses.map((c) => c._id) } }).select("_id").lean();
  await assignFacultyToSubjects(seedSubjects);

  // Seed timetable slots for semester 1 of each course
  let slotCount = 0;
  for (const sem of seedSemesters) {
    slotCount += await seedTimetableForSemester(sem._id);
  }
  console.log("[seed:academics] created timetable slots:", slotCount);

  // Seed results for the first semester of the first seeded course
  const semForResults = seedSemesters[0];
  if (semForResults && seedStudents.length) {
    const subjectsForSem = await Subject.find({ semester: semForResults._id }).select("_id").lean();
    const resCount = await seedResultsForStudents(semForResults._id, subjectsForSem, seedStudents);
    console.log("[seed:academics] created published results:", resCount);
  } else {
    console.warn("[seed:academics] skipping results seed (missing semester or students)");
  }

  console.log("[seed:academics] done.");
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed:academics] failed:", err?.message || err);
  process.exit(1);
});

