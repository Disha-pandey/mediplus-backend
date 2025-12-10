import validator from "validator";
import bcrypt from "bcrypt";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import doctorModel from "../models/doctorModel.js";
import jwt from 'jsonwebtoken';
import appointmentModel from "../models/appointmentModel.js";
import userModel from "../models/userModel.js";

// ✅ Add Doctor Controller
const addDoctor = async (req, res) => {
   console.log("REQ FILE =>", req.file);
    console.log("REQ BODY =>", req.body);
    // 👆👆 YAHAN ADD KARO
  try {
    const {
      name,
      email,
      password,
      speciality,
      degree,
      experience,
      about,
      fees,
      address
    } = req.body;
    const imageFile=req.file
    console.log({name,email,password,speciality,degree,experience,about,fees,address})

    // 🔒 Required field check
    if (
      !name || !email || !password || !speciality ||
      !degree || !experience || !about || !fees || !address
    ) {
      return res.status(400).json({ success: false, message: "Missing Details" });
    }

    // 📧 Email validation
    if (!validator.isEmail(email)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email" });
    }

    // 🔐 Password strength
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: "Please enter a strong password" });
    }

    // 📛 Duplicate email check
    const existingDoctor = await doctorModel.findOne({ email });
    if (existingDoctor) {
      return res.status(400).json({ success: false, message: "Email already exists" });
    }

    // 🔒 Password hashing
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 🌐 Image upload
    // const imageUpload = await cloudinary.uploader.upload(imageFile.path,{resource_type:"image"})
    // const imageUrl=imageUpload.secure_url
    // 📌 Cloudinary Upload Using upload_stream (Correct for memoryStorage)
let imageUrl = "";
if (req.file) {
  const uploadResult = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: "image" },
      (err, result) => {
        if (err) reject(err);
        else resolve(result);
      }
    );
    stream.end(req.file.buffer);  // ⭐ MOST IMPORTANT
  });

  imageUrl = uploadResult.secure_url;
} else {
  return res.status(400).json({ success: false, message: "Image missing" });
}

    // 📦 Parse address safely
    let parsedAddress = {};
    try {
      parsedAddress = typeof address === "string" ? JSON.parse(address) : address;
    } catch (e) {
      return res.status(400).json({ success: false, message: "Invalid address format" });
    }

    // 🩺 Final Doctor Object
    const doctorData = {
      name,
      email,
      password: hashedPassword,
      speciality,
      degree,
      experience,
      about,
      fees,
      image: imageUrl,
      address: parsedAddress,
      available: true,
      date: Date.now()
    };

    // 💾 Save to DB
    const newDoctor = new doctorModel(doctorData);
    await newDoctor.save();

    res.status(201).json({ success: true, message: "Doctor Added" });

  } catch (error) {
    console.error("Add doctor error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Admin Login Controller
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
     // const token = jwt.sign(email + password, process.env.JWT_SECRET);
     const token = jwt.sign(
  { email, role: "admin" },  // ✅ meaningful payload
  process.env.JWT_SECRET,
      // optional expiration
);

      res.json({
        success: true,
        token,
        message: "Logged in successfully. Please change your password if it's temporary."
      });
    } else {
      res.json({ success: false, message: "Invalid credentials" });
    }

  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};
// API TO GET ALL doctors list for admin panel
const allDoctors =async(req,res) =>{
  try{
    const doctors=await doctorModel.find({}).select('-password')
    res.json({success:true,doctors})
  }
  catch(error){
     console.log(error);
    res.json({ success: false, message: error.message });
  }
}
//api to get all appointments list
const appointmentsAdmin=async(req,res)=>{
  try{
    const appointments=await appointmentModel.find({})
    res.json({success:true,appointments})
  }
  catch(error){
     console.log(error);
    res.json({ success: false, message: error.message });
  }
}
//api for appointment cancellation
const appointmentCancel=async (req,res) => {
  try{
  console.log("🔔 appointmentCancel hit:", req.body.appointmentId);

    const {appointmentId}=req.body
    const appointmentData=await appointmentModel.findById(appointmentId)
   
    await appointmentModel.findByIdAndUpdate(appointmentId,{cancelled:true})
    //releasing doctor slot
    const {docId,slotDate,slotTime}=appointmentData
    const doctorData=await doctorModel.findById(docId)
    let slots_booked=doctorData.slots_booked
    slots_booked[slotDate]=slots_booked[slotDate].filter(e=>e!==slotTime)
    await doctorModel.findByIdAndUpdate(docId,{slots_booked})
    res.json({success:true,message:'Appointment cancelled successfully'})
  }
  catch(error){
     console.log(error)
res.json({success:false,message:error.message})
  }
}
//api to get dashboard data for admin panel
// const adminDashboard=async(req,res)=>{
//   try{
//     const doctors =await doctorModel.find({})
//     const users= await userModel.find({})
//     const appointments =await appointmentModel.find({})
//     const dashData={
//       doctors:doctors.length,
//       appointments:appointments.length,
//       patients:users.length,
//       latestAppointments:appointments.reverse().slice(0,5)
//     }
//     res.json({success:true,dashData})
//   }
//   catch(error){
//        console.log(error)
// res.json({success:false,message:error.message})
//   }
// }
const adminDashboard = async (req, res) => {
  try {
    const doctors = await doctorModel.find({});
    const users = await userModel.find({});
    const appointments = await appointmentModel.find({});

    const latestAppointments = await appointmentModel
      .find({})
      .sort({ date: -1 })
      .limit(5)
      .lean();

    // Add doctor info
    for (let i = 0; i < latestAppointments.length; i++) {
      const doc = await doctorModel.findById(latestAppointments[i].docId).select("name image");
      latestAppointments[i].docData = doc || { name: "Unknown", image: "/default.jpg" };
    }

    const dashData = {
      doctors: doctors.length,
      appointments: appointments.length,
      patients: users.length,
      latestAppointments,
    };

    res.json({ success: true, dashData });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export { addDoctor, loginAdmin ,allDoctors,appointmentsAdmin,appointmentCancel,adminDashboard};
