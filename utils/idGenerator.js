import { Counter } from "../models/counter.model.js";

/**
 * @param {string} key  Stable counter key (e.g. `employeeId_2026`)
 * @returns {Promise<number>} Next 1-based sequence value for this key
 */
export async function nextSequence(key) {
  const doc = await Counter.findByIdAndUpdate(
    key,
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return doc.seq;
}

/** e.g. EMP202600001 */
export async function nextEmployeeId() {
  const year = new Date().getFullYear();
  const n = await nextSequence(`employeeId_${year}`);
  return `EMP${year}${String(n).padStart(5, "0")}`;
}

/** e.g. ENR202600001 */
export async function nextEnrollmentNo() {
  const year = new Date().getFullYear();
  const n = await nextSequence(`enrollment_${year}`);
  return `ENR${year}${String(n).padStart(5, "0")}`;
}
