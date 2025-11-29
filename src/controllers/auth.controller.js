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
      return res.status(400).json({ message: "User already exists" });
    }

    // Create User (Model handles the hashing)
    const user = await User.create({
      username,
      email,
      password,
    });

    if (user) {
      // Send response with Token (from utils)
      res.status(201).json({
        Response: "User registered successfully",
        _id: user._id,
        username: user.username,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// description: Login user & get token
// route: POST /api/auth/login
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Find user & select password (because select is false in model)
    const user = await User.findOne({ email }).select("+password");

    // Check if user exists AND if password matches
    if (user && (await user.matchPassword(password))) {
      res.json({
        Response: "User logged in successfully",
        _id: user._id,
        username: user.username,
        email: user.email,
        token: generateToken(user._id), // Generate token from utils
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}
