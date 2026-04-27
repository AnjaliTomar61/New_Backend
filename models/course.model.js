// models/course.model.js
import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    courseName: {
      type: String,
      required: true,
    },
    courseCode: {
      type: String,
      required: true,
      unique: true,
    },

  
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },

//     department: {
//   type: String,
//   required: true
// },

    duration: {
      type: String,
      required: true,
    },
    totalSemesters: {
      type: Number,
      required: true,
    },
    fees: {
      type: Number,
      required: true,
    },
    description: String,
    eligibility: String,

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const Course = mongoose.model("Course", courseSchema);