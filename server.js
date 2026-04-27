import express from "express";
import { connectDB } from "./config/db.js";
import userRouter from './routes/user.route.js'
import facultyRoutes from "./routes/faculty.route.js";
import courseRoutes from "./routes/course.route.js"
import departmentRoutes from "./routes/department.route.js";
// import cors from "cors";
import cors from 'cors'


const app=express()
app.use(express.json());
app.use(cors())
connectDB();

app.use("/api/v1/user", userRouter);
app.use("/api/faculty", facultyRoutes);
app.use("/api/course",courseRoutes);
app.use("/api/department", departmentRoutes);
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

app.listen(3000,function(){
    console.log("server is running")
})