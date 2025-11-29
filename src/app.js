import express from "express";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.route.js";
import productRoutes from "./routes/product.route.js";
import swaggerSpec from "./config/swagger.js";

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
// This prefixes all products routes with "/api/products"
app.use("/api/products",productRoutes);
app.use("/api-docs",swaggerUi.serve,swaggerUi.setup(swaggerSpec));

export default app;
