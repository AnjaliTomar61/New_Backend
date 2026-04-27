import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import userRouter from './routes/user.route.js'
import facultyRoutes from "./routes/faculty.route.js";
import courseRoutes from "./routes/course.route.js"
import departmentRoutes from "./routes/department.route.js";
import semesterRoutes from "./routes/semester.route.js";
import subjectRoutes from "./routes/subject.route.js";
// import cors from "cors";
import cors from 'cors'
import { errorHandler, notFound } from "./middleware/errorHandler.js";

dotenv.config();

const app=express()
app.use(express.json());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  })
);
connectDB();

app.use("/api/v1/user", userRouter);
app.use("/api/faculty", facultyRoutes);
app.use("/api/course",courseRoutes);
app.use("/api/department", departmentRoutes);
app.use("/api/semesters", semesterRoutes);
app.use("/api/subjects", subjectRoutes);
app.get("/",(req,res)=>{
    try{
        return res.json({
            message:"server is running successfully",
            success:true
        })
    }catch(error){
        return res.json({
            message:"server is not running",
            success:false
        })
    }

    
})

app.use(notFound);
app.use(errorHandler);

const port = process.env.PORT || 3000;
app.listen(port,function(){
    console.log(`server is running on ${port}`)
})