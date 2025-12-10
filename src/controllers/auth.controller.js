import User from "../models/user.model.js";
import generateToken from "../utils/generateToken.js";

// description: To register a new user
// route: POST /api/auth/register
export async function register(req, res) {
  try {
    const { username, email, password } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        status: false,
        message: "User already exists",
        data: null,
      });
    }

    // ... inside your register function

    // Create User
    const user = await User.create({
      username,
      email,
      password,
    });

    if (user) {
      // Generate the token once
      const token = generateToken(user._id);

      // Send Standardized Response
      res.status(201).json({
        status: true,
        message: "User registered successfully",
        data: {
          _id: user._id,
          username: user.username,
          email: user.email,
          token: token, // Token is neatly inside 'data'
        },
      });
    } else {
      res.status(401).json({
        success: false,
        message: "Invalid user data",
        data: null,
      });
    }
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

// description: Login user & get token
// route: POST /api/auth/login
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    // 1. Find user & select password (because select is false in model)
    const user = await User.findOne({ email }).select("+password");

    // 2. Check if user exists AND if password matches
    if (user && (await user.matchPassword(password))) {
      // Generate the token
      const token = generateToken(user._id);

      // 3. Send status response
      res.json({
        status: true,
        message: "User logged in successfully",
        data: {
          _id: user._id,
          username: user.username,
          email: user.email,
          token: token, // Token is neatly inside 'data'
        },
      });
    } else {
      res.status(401).json({
        success: false,
        message: "Invalid credentials",
        data: null,
      });
    }
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
}

// description: Google Auth Callback
// route: GET /api/auth/google/callback
export const googleAuthCallback = (req, res) => {
  try {
    // req.user is populated by passport
    const token = generateToken(req.user._id);

    // Redirect to frontend with token
    // Change http://localhost:5173 to your actual Frontend URL
    res.redirect(
      `${process.env.FRONTEND_URL || "http://localhost:5173"}/login-success?token=${token}`
    );
  } catch (error) {
    console.error(error);
    res.redirect(
      `${process.env.FRONTEND_URL || "http://localhost:5173"}/login?error=GoogleAuthFailed`
    );
  }
};
