import mongoose from "mongoose";

export const connectDB= async()=>{
    try{
        const mongoUri =
          process.env.MONGO_URI || "mongodb://localhost:27017/smart_campus";

        await mongoose.connect(mongoUri)

        console.log("database connected ")
    } catch(error){
        console.log("database not connected")
        throw error;
    }
}