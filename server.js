import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import userRouter from "./routes/user.route.js";
import facultyRoutes from "./routes/faculty.route.js";
import courseRoutes from "./routes/course.route.js";
import departmentRoutes from "./routes/department.route.js";
import semesterRoutes from "./routes/semester.route.js";
import subjectRoutes from "./routes/subject.route.js";
import attendanceRoutes from "./routes/attendance.route.js";
import timetableRoutes from "./routes/timetable.route.js";
import academicResultRoutes from "./routes/academicResult.route.js";
import cors from "cors";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  })
);

app.use("/api/v1/user", userRouter);
app.use("/api/faculty", facultyRoutes);
app.use("/api/course", courseRoutes);
app.use("/api/department", departmentRoutes);
app.use("/api/semesters", semesterRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/timetable", timetableRoutes);
app.use("/api/results", academicResultRoutes);
app.get("/", (req, res) => {
  try {
    return res.json({
      message: "server is running successfully",
      success: true,
      dbReady: mongoose.connection.readyState === 1,
      dbName: mongoose.connection.db?.databaseName ?? null,
    });
  } catch (error) {
    return res.json({
      message: "server is not running",
      success: false,
    });
  }
});

app.use(notFound);
app.use(errorHandler);

const port = process.env.PORT || 3000;

async function start() {
  await connectDB();

  app.listen(port, () => {
    console.log(`[HTTP] server listening on port ${port}`);
  });
}

start().catch((err) => {
  console.error("[HTTP] failed to start:", err?.message || err);
  process.exit(1);
});
