import mongoose from "mongoose";

/** Atomic sequence for employee IDs, enrollment numbers, etc. */
const counterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { collection: "counters" }
);

export const Counter = mongoose.model("Counter", counterSchema);
