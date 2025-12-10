import jwt from 'jsonwebtoken';
import doctorModel from '../models/doctorModel.js';

const authDoctor = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authorization token missing or invalid format" });
    }

    const dtoken = authHeader.split(" ")[1];
    if (!dtoken) {
      return res.status(401).json({ message: "Token not found" });
    }

    const token_decode = jwt.verify(dtoken, process.env.JWT_SECRET);

    // ✅ Debug logs added here
    console.log("🔓 Decoded token:", token_decode);

    if (!token_decode || !token_decode.id) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const doctor = await doctorModel.findById(token_decode.id).select("-password");

    // ✅ Check if doctor was found
    console.log("🩺 Doctor from DB:", doctor);

    if (!doctor) {
      return res.status(401).json({ message: "Doctor not found" });
    }

    req.doctor = doctor;
    next();

  } catch (error) {
    console.error("❌ authDoctor error:", error);
    return res.status(401).json({ message: "Authentication failed", error: error.message });
  }
};

export default authDoctor;
