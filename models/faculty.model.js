// models/faculty.model.js
import mongoose from "mongoose";

const facultySchema = new mongoose.Schema(
  {
    // 🔐 Admin Controlled Fields
    employeeId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    officialEmail: {
      type: String,
      required: true,
      unique: true,
    },
    department: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["Professor", "Assistant Professor", "HOD", "Lecturer"],
      default: "Lecturer",
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    // 🔑 Authentication
    password: {
      type: String,
      required: true,
    },

    // 👤 Faculty Editable Fields
    phone: {
      type: String,
    },
    profilePhoto: {
      type: String,
    },
    qualification: {
      type: String,
    },
    experience: {
      type: Number, // in years
    },
    address: {
      type: String,
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
    },
    dateOfBirth: {
      type: Date,
    },

    // 📚 Extra Academic Info
    subjects: [
      {
        type: String,
      },
    ],
    bio: {
      type: String,
    },

    // 🟢 System Fields
    // isProfileComple
    
    // ted: {
    //   type: Boolean,
    //   default: false,
    // },
  },
  { timestamps: true }
);

export const Faculty = mongoose.model("Faculty", facultySchema);