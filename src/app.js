import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.route.js";
import productRoutes from "./routes/product.route.js";

// Load env vars
dotenv.config();

// Initialize Express
const app = express();
app.use(express.json()); // Allows app to accept JSON data in Body

// Connect to Database
connectDB();
// ROUTES
// This prefixes all auth routes with "/api/auth"
app.use("/api/auth",authRoutes);
app.use("/api/products",productRoutes);

export default app;
