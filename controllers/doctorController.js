import doctorModel from "../models/doctorModel.js";
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import appointmentModel from "../models/appointmentModel.js";
// const changeAvailability =async(req,res)=>{
//     try{
//         const docId=req.doctor._id;
//         const docData = await doctorModel.findById(docId)
//         await doctorModel.findByIdAndUpdate(docId,{available:!docData.available})
//         res.json ({success:true,message:'Availability Changed'})
//     }
//     catch(error){
//        console.log(error) 
//        res.json({success:false,message:error.message})
//     }
// }
const doctorList=async(req,res)=>{
    try{
        const doctors=await doctorModel.find({}).select(['-password','-email'])
        res.json({success:true,doctors})
        }    
    catch(error){
         console.log(error) 
       res.json({success:false,message:error.message})
    }
}
const changeAvailability = async (req, res) => {
  try {
    let docId;

    // Admin request
    if (req.admin) {
      docId = req.body.docId;
    }
    // Doctor request
    else if (req.doctor) {
      docId = req.doctor._id;
    }

    if (!docId) {
      return res.status(400).json({ success: false, message: "Doctor ID not provided" });
    }

    const docData = await doctorModel.findById(docId);
    if (!docData) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    // If availability sent directly from admin
    const newAvailability = req.body.available !== undefined ? req.body.available : !docData.available;

    await doctorModel.findByIdAndUpdate(docId, { available: newAvailability });

    res.json({ success: true, message: "Availability Changed" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

//api for doctor login
const  loginDoctor=async(req,res)=>{
    try{
        const {email,password} =req.body
        const doctor=await doctorModel.findOne({email})
        if(!doctor){
            return res.json({success:false,message:'Invalid credentials'})
        }
       const isMatch =await bcrypt.compare(password,doctor.password)
        if(isMatch){
            const token=jwt.sign({id:doctor._id},process.env.JWT_SECRET)
            res.json({success:true,token,doctor})
        }
        else{
             return res.json({success:false,message:'Invalid credentials'})
         }
    }
    catch(error){
         console.log(error) 
       res.json({success:false,message:error.message})
    }
}
//api to get doctor appointments for doctor panel
// const appointmentsDoctor=async (req,res) => {
//   console.log("Doctor ID:", req.doctor._id);
// const appointments = await appointmentModel.find({ docId: req.doctor._id.toString() });
// console.log("Appointments found:", appointments.length);

//     console.log("req.doctor:", req.doctor);

//     try{
//         const docId=req.doctor._id.toString();
//       const appointments = await appointmentModel.find({ docId: req.doctor._id.toString() });

//          console.log("Appointments Found:", appointments.length);
//         res.json({success:true,appointments})
//     }
//     catch(error){
//         console.log(error) 
//        res.json({success:false,message:error.message})
//     }
    
// }
const appointmentsDoctor = async (req, res) => {
  try {
    const doctorId = req.doctor?._id.toString();
    console.log("👨‍⚕️ Doctor ID:", doctorId);

    if (!doctorId) {
      return res.status(400).json({ success: false, message: "Doctor ID missing in request" });
    }

    const appointments = await appointmentModel.find({ docId: doctorId })
      .populate("userId", "-password") // 🧠 Get patient data
      .populate("docId", "-password"); // (optional)

    console.log("📄 Appointments found:", appointments.length);
    res.status(200).json({ success: true, appointments });
  } catch (error) {
    console.error("❌ Error in getAppointments:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

//api to mark appointment completed for doctor panel
// const appointmentComplete =async (req,res) => {
//     try{
//         const {docId,appointmentId} =req.body
//         const appointmentData = await appointmentModel.findById(appointmentId)
//         if(appointmentData && appointmentData.docId===docId){
//             await appointmentModel.findByIdAndUpdate(appointmentId,{isCompleted:true})
//             return res.json({success:true,message:'Appointment Completed'})
//         }
//         else{
//                return res.json({success:false,message:'Marked Failed'})
//         }
//     }
//     catch(error){
//          console.log(error) 
//        res.json({success:false,message:error.message})
//     }
    
//}
const appointmentComplete = async (req, res) => {
  try {
    const appointmentId = req.body.appointmentId;
    const docId = req.doctor._id.toString();
    const appointmentData = await appointmentModel.findById(appointmentId);

    if (!appointmentData) {
      return res.json({ success: false, message: "Appointment not found" });
    }

    // ✅ If doctor: allow only their own appointments
    if (req.doctor && appointmentData.docId === docId) {
      await appointmentModel.findByIdAndUpdate(appointmentId, { isCompleted: true });
      return res.json({ success: true, message: "Appointment Completed by Doctor" });
    }

    // ✅ If admin: allow all
    if (req.admin) {
      await appointmentModel.findByIdAndUpdate(appointmentId, { isCompleted: true });
      return res.json({ success: true, message: "Appointment Completed by Admin" });
    }

    return res.json({ success: false, message: "Not authorized" });

  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};


//api to cancel appointment  for doctor panel

// const appointmentCancel =async (req,res) => {
//     try{
//         const {docId,appointmentId} =req.body
//         const appointmentData = await appointmentModel.findById(appointmentId)
//         if(appointmentData && appointmentData.docId===docId){
//             await appointmentModel.findByIdAndUpdate(appointmentId,{cancelled:true})
//             return res.json({success:true,message:'Appointment Cancelled'})
//         }
//         else{
//                return res.json({success:false,message:'Cancellation Failed'})
//         }
//     }
//     catch(error){
//          console.log(error) 
//        res.json({success:false,message:error.message})
//     }
    //}
    const appointmentCancel = async (req, res) => {
  try {
    const appointmentId = req.body.appointmentId;
    const docId = req.doctor._id.toString();
    const appointmentData = await appointmentModel.findById(appointmentId);

    if (!appointmentData) {
      return res.json({ success: false, message: "Appointment not found" });
    }

    if (req.doctor && appointmentData.docId === docId) {
      await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true });
      return res.json({ success: true, message: "Appointment Cancelled by Doctor" });
    }

    if (req.admin) {
      await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true });
      return res.json({ success: true, message: "Appointment Cancelled by Admin" });
    }

    return res.json({ success: false, message: "Not authorized" });

  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};
// api to get dashboard data for doctor panel
const doctorDashboard = async (req, res) => {
  try {
    const docId = req.doctor._id.toString(); // ✅ correct source
    const appointments = await appointmentModel.find({ docId });

    let earnings = 0;
    appointments.forEach((item) => {
      if (item.isCompleted || item.payment) {
        earnings += item.amount;
      }
    });

    let patients = [];
    appointments.forEach((item) => {
      if (!patients.includes(item.userId.toString())) {
        patients.push(item.userId.toString());
      }
    });

    const dashData = {
      earnings,
      appointments: appointments.length,
      patients: patients.length,
      latestAppointments: appointments.reverse().slice(0, 5),
    };

    res.json({ success: true, dashData });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};
// Api to get doctor profile for Doctor Panel
const doctorProfile=async (req,res) => {
  try{
    const docId = req.doctor._id.toString();
    const profileData=await doctorModel.findById(docId).select('-password')
    res.json({success:true,profileData})
  }
  catch(error){
     console.log(error);
    res.json({ success: false, message: error.message });
  }
}
// api to update doctor profile data from Doctor panel
const updateDoctorProfile=async (req,res) => {
  try{
    const docId = req.doctor._id.toString();
    const {fees,address,available}=req.body
    await doctorModel.findByIdAndUpdate(docId,{fees,address,available})
      res.json({success:true,message:'Profile Updated'})
  }
  catch(error){
     console.log(error);
    res.json({ success: false, message: error.message });
  }
}

export {changeAvailability,doctorList,loginDoctor,appointmentsDoctor,appointmentComplete,appointmentCancel,doctorDashboard,doctorProfile,updateDoctorProfile}