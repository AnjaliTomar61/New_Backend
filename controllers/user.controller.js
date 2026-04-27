import { user } from "../models/user.model.js";

export const signup = async(req,res)=>{

    try{
        const{name,email,mobile,password,role}=req.body;

        if(!name || !email|| !mobile || !password || !role){
            return res.json({
                message:"all field are required",
                success:false
            })
        }
        const newuser=user({name,email,mobile,password,role})
        await newuser.save();

        return res.json({
            message:"new user add successfully",
            success:true,
        })
    }
    catch(error){
        return res.json({
            message:"server error",
            error:error.message
        })
    }
}



export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // check fields
    if (!email || !password) {
      return res.json({
        message: "Email and password are required",
        success: false,
      });
    }

    // check user exists
    const existingUser = await user.findOne({ email });

    if (!existingUser) {
      return res.json({
        message: "User not found",
        success: false,
      });
    }

    // check password (plain text, same as your signup)
    if (existingUser.password !== password) {
      return res.json({
        message: "Invalid password",
        success: false,
      });
    }

    return res.json({
      message: "Login successful",
      success: true,
      data: existingUser,
    });

  } catch (error) {
    return res.json({
      message: "Server error",
      error: error.message,
    });
  }
};

export const getalluser = async(req,res)=>{
  try{
    const alluser= await user.find()
    if(alluser.length<=0){
      return res.json({
        message:"user not found",
        success:false
      })
    }
    return res.json({
      message:"record of user get successfully",
      data:alluser,
      status:true
    })

  }
  catch(error){
    return res.json({
      message:"server error",
      error:error.message
    })
  }
}

export const completeProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const existingUser = await user.findById(userId);

    console.log("User ID:", userId);
    console.log("User Found:", existingUser);

    if (!existingUser) {
      return res.json({
        message: "User not found",
        success: false
      });
    }

    Object.assign(existingUser, req.body);

    await existingUser.save();

    return res.json({
      message: "Profile updated successfully",
      success: true,
      data: existingUser
    });

  } catch (error) {
    return res.json({
      message: "Server error",
      error: error.message
    });
  }
};