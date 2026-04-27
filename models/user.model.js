import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    select: false,
  },
  mobile: String,
  role: {
    type: String,
    enum: ["admin", "faculty", "student"],
    required: true,
  },

  // 🔹 Profile Fields
  gender: {
    type: String,
    enum: ["male", "female", "other"],
  },
  dob: Date,
  bio: String,

  // 🔹 Address (nested object)
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
  },

  // 🔹 Skills & Interests (array)
  skills: [String],
  interests: [String],

}, { timestamps: true });

export const user = mongoose.model("user", userSchema);


// const userSchema = new mongoose.Schema({
//     name:String,
//     email:String,
//     password:String,
//     mobile:String,
//     role:String
// })
