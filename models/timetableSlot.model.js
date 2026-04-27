import mongoose from "mongoose";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const timetableSlotSchema = new mongoose.Schema(
  {
    semester: { type: mongoose.Schema.Types.ObjectId, ref: "Semester", required: true, index: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true, index: true },
    day: { type: String, required: true, enum: DAYS, lowercase: true, trim: true },
    startTime: { type: String, required: true, trim: true, match: /^\d{2}:\d{2}$/ },
    endTime: { type: String, required: true, trim: true, match: /^\d{2}:\d{2}$/ },
    room: { type: String, trim: true, default: "" },
    note: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

timetableSlotSchema.index({ semester: 1, subject: 1, day: 1, startTime: 1 }, { unique: true });

export const TimetableSlot = mongoose.model("TimetableSlot", timetableSlotSchema);

export const TIMETABLE_DAY_ORDER = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6 };
