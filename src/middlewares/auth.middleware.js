import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const protect = async (req, res, next) => {
  let token;

  // 1. Check for token in "Authorization: Bearer <token>" header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    // Simple split. If it fails or is empty, token stays undefined.
    const parts = req.headers.authorization.split(" ");
    if (parts.length === 2) {
      token = parts[1];
    }
  }

  // 2. Check for token in Cookies if not found in header
  if (!token && req.headers.cookie) {
    // MANUAL PARSING: This replaces the need for 'cookie-parser'
    const cookies = req.headers.cookie.split(";").reduce((acc, cookie) => {
      const parts = cookie.trim().split("=");
      // Ensure we have both name and value
      if (parts.length >= 2) {
        const name = parts.shift().trim();
        const value = decodeURIComponent(parts.join("="));
        acc[name] = value;
      }
      return acc;
    }, {});

    token = cookies.token;
  }

  // 3. Verify the token
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find user (exclude password)
      req.user = await User.findById(decoded.id).select("-password");

      next();
    } catch (error) {
      console.error("Token verification failed:", error.message);
      res.status(401).json({ message: "Not authorized, token failed" });
    }
  } else {
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

