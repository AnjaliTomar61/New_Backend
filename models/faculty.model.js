// models/faculty.model.js
/** Admin-managed employment row. Identity & contact live on `user`; teaching profile on `FacultyProfile`. */
import mongoose from "mongoose";

const facultySchema = new mongoose.Schema(
  {
    /** Portal account this HR row belongs to (set for all new creates). */
    portalUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      sparse: true,
      index: true,
    },
    employeeId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    /**
     * Same as portal login email (lowercase). Used for legacy login migration
     * and admin listings when populated from `user`.
     */
    officialEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    /** Free-text department from admin form (not the same as FacultyProfile.department ObjectId). */
    departmentName: {
      type: String,
      required: true,
      trim: true,
    },
    designation: {
      type: String,
      enum: ["Professor", "Assistant Professor", "HOD", "Lecturer"],
      default: "Lecturer",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    /** Legacy / admin default password until user changes portal password. */
    password: {
      type: String,
      select: false,
      default: "",
    },
  },
  { timestamps: true }
);

export const Faculty = mongoose.model("Faculty", facultySchema);
