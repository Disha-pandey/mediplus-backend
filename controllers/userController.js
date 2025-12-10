import validator from 'validator';
import bcrypt from 'bcrypt';
import userModel from '../models/userModel.js';
import jwt from 'jsonwebtoken';
import {v2 as cloudinary} from 'cloudinary'
import doctorModel from '../models/doctorModel.js';
import appointmentModel from '../models/appointmentModel.js';
import razorpay from 'razorpay'

// ✅ API to register user
const registerUser = async (req, res) => {
  try {
    console.log("Register Request Body:", req.body); // 🔍 Debug input

    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ success: false, message: "Enter a valid email" });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters long" });
    }

    // Check if user already exists
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save user
    const newUser = new userModel({ name, email, password: hashedPassword });
    const user = await newUser.save();

    // Generate JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    res.status(201).json({ success: true, token });
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ✅ API for user login
const loginUser = async (req, res) => {
  try {
    console.log("Login Request Body:", req.body); // 🔍 Debug input

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: "User does not exist" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    res.status(200).json({ success: true, token });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
// api to user profile data
const getProfile = async (req, res) => {
  try {
    const userId = req.userId

    const userData = await userModel.findById(userId).select('-password -fees');

    if (!userData) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const user = {
      _id: userData._id,
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      gender: userData.gender || "Not Selected",
      dob: userData.dob || "Not Selected",
      address: userData.address || {},
       image: userData.image || "",
    };

    res.json({ success: true, userData: user });
  } catch (error) {
    console.error("Profile Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// api to update user profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.userId;
    console.log('=== req.body ===');
    console.log(req.body);

    console.log('=== req.file ===');
    console.log(req.file); // Optional: check uploaded file if any
    const { name, phone, address, dob, gender } = req.body;
    

    if (!name || !phone || !dob || !gender) {
      return res.json({ success: false, message: "Data Missing" });
    }

    // If address is sent as JSON string from FormData
    const parsedAddress = typeof address === 'string' ? JSON.parse(address) : address;

    const updatedFields = {
      name,
      phone,
      dob,
      gender,
      address: parsedAddress,
    };

   // Optional: Upload image if present
if (req.file) {
  const uploadResult = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: "image" },
      (err, result) => {
        if (err) reject(err);
        else resolve(result);
      }
    );
    stream.end(req.file.buffer);   // ⭐ MOST IMPORTANT
  });

  updatedFields.image = uploadResult.secure_url;
}




    await userModel.findByIdAndUpdate(userId, updatedFields);
    res.json({ success: true, message: "Profile Updated" });

  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message || "Something went wrong" });
  }
};
// api to book appointment
const bookAppointment = async(req,res)=>{
  try{
    const userId = req.userId;
    const {docId,slotDate,slotTime} =req.body
  //  const userId = req.userId;
    const docData = await doctorModel.findById(docId).select('-password')
    if(!docData.available){
      return res.json({success:false,message:'Doctor not available'})
    }
    let slots_booked=docData.slots_booked

    // checking for slot availability
    if(slots_booked[slotDate]){
      if(slots_booked[slotDate].includes(slotTime)){
          return res.json({success:false,message:'Slot not available'})
      }
      else{
        slots_booked[slotDate].push(slotTime)
      }
    }
    else{
      slots_booked[slotDate]=[]
      slots_booked[slotDate].push(slotTime)
    }
    const userData=await userModel.findById(userId).select('-password')
    delete docData.slots_booked
    const appointmentData ={
      userId,
      docId:docId.toString(),
      userData,
      docData,
      amount:docData.fees,
      slotTime,
      slotDate,
      date:Date.now()
    }
    const newAppointment = new appointmentModel(appointmentData)
    await newAppointment.save()
    //save new slots data in docdata
    await doctorModel.findByIdAndUpdate(docId,{slots_booked})
    res.json({success:true,message:'Appointment Booked'})
  }
  catch(error){
console.log(error)
res.json({success:false,message:error.message})
  }
}
//api to get user appointment for frontend my appointments page
const listAppointment=async (req,res) => {
  console.log("✅ listAppointment route hit");
  try{
    const userId=req.userId;
    const appointments=await appointmentModel.find({userId})
    res.json({success:true,appointments})
  }
  catch(error){
    console.log(error)
res.json({success:false,message:error.message})
  }
}
//api to cancel appointment
const cancelAppointment=async (req,res) => {
  try{
    const userId=req.userId;
    const {appointmentId}=req.body
    const appointmentData=await appointmentModel.findById(appointmentId)
    //verify appointment user
    if(appointmentData.userId.toString()!==userId){
      return res.json({success:false,message:'Unauthorized action'})
    }
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
const razorpayInstance = new razorpay({
  key_id:process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
})
//api to make payment of appointment using razorpay
const paymentRazorpay=async(req,res)=>{
  try{
const {appointmentId}= req.body
const appointmentData=await appointmentModel.findById(appointmentId)
if(!appointmentData || appointmentData.cancelled){
  return res.json({success:false,message:"Appointment Cancelled or not found"})
}
// creating option for razorpaypayment
const options={
  amount:appointmentData.amount*100,
  currency:process.env.CURRENCY,
  receipt:appointmentId,
}
//creation of an order
const order=await razorpayInstance.orders.create(options)
res.json({success:true,order})
  }
  catch(error){
     console.log(error)
res.json({success:false,message:error.message})
  }
}
//api to verify payment of razorpay
const verifyRazorpay =async(req,res)=>{
  try{
    const {razorpay_order_id}=req.body
    const orderInfo=await razorpayInstance.orders.fetch(razorpay_order_id)
    console.log(orderInfo)
    if(orderInfo.status==='paid'){
      await appointmentModel.findByIdAndUpdate(orderInfo.receipt,{payment:true})
    res.json({success:true,message:"Payment Successful"})
    }
    else{
      res.json({success:false,message:"Payment failed"})
    }

  }
  catch(error){
       console.log(error)
res.json({success:false,message:error.message})
  }
}

export { registerUser, loginUser, getProfile, updateProfile,bookAppointment,listAppointment,cancelAppointment,paymentRazorpay, verifyRazorpay };
