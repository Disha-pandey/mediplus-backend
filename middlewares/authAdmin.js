import jwt from 'jsonwebtoken';

const authAdmin = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Not authorized. Login again." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check email (if you're storing email in token)
    if (decoded.email !== process.env.ADMIN_EMAIL) {
      return res.status(403).json({ success: false, message: "Access denied: Admins only." });
    }

    req.admin = decoded;
    next();
  } catch (error) {
    console.error("Admin Auth Error:", error);
    return res.status(401).json({ success: false, message: "Token invalid or expired. Login again." });
  }
};

export default authAdmin;
