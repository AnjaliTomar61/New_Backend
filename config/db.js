import mongoose from "mongoose";

export const connectDB= async()=>{
    try{
        await mongoose.connect("mongodb://localhost:27017/new_Backend")

        console.log("database connected ")
    } catch(error){
        console.log("database not connected")
    }
}