import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const protect = async (req, res, next) => {
  let token;

  // Check if the "Authorization" header exists and starts with "Bearer"
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Get the token from the header (remove "Bearer " string)
      token = req.headers.authorization.split(" ")[1];

      // Verify the token using your secret key
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find the user in DB and attach it to the request object
      // (We exclude the password for security)
      req.user = await User.findById(decoded.id).select("-password");

      // Move to the next step (e.g. Create Product)
      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  if (!token) {
    res.status(401).json({ message: "Not authorized, no token" });
  }
};

// ADMIN CHECK: Verifies the 'isAdmin' field
export const admin = (req, res, next) => {
  // We can only check req.user because 'protect' ran first!
  if (req.user && req.user.isAdmin) {
    next(); // Access Granted
  } else {
    res.status(401).json({ message: "Not authorized as an admin" });
  }
};

