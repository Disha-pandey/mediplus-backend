// utils/multer.js
import multer from "multer";

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
  fileFilter: (req, file, cb) => {
    console.log("FILE FILTER HIT:", file?.originalname); // DEBUG
    if (!file) {
      return cb(new Error("No file received"));
    }
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only images allowed"));
    }
    cb(null, true);
  },
});

export default upload;
