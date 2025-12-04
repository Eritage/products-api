import express from "express";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.route.js";
import productRoutes from "./routes/product.route.js";
import swaggerSpec from "./config/swagger.js";
import cors from "cors";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import { rateLimit } from "express-rate-limit";
import hpp from "hpp";

// Load env vars
dotenv.config();

// Initialize Express
const app = express();

// Helmet: Secure HTTP Headers
// It hides "X-Powered-By: Express" and sets security headers
app.use(helmet());

// CORS: Allow Frontend Access
// Right now we allow ALL (*). In production, you change this to your frontend URL.
app.use(cors({ origin: "*" }));

// Body Parser: Reads JSON
app.use(express.json());// Allows app to accept JSON data in Body

// Add this manually to unlock req.query before sanitization
app.use((req, res, next) => {
  // The simple assignment failed because req.query is read-only.
  // We use Object.defineProperty to force-overwrite it as a writable property.
  Object.defineProperty(req, "query", {
    value: { ...req.query },
    writable: true,
  });
  next();
});
// Data Sanitization: Prevent NoSQL Injection
// Stops hackers from sending data like { "$gt": "" } to bypass login
app.use(mongoSanitize());

// 5. Parameter Pollution: Prevent duplicate query params
app.use(hpp());

// Rate Limiting: Stop Spam
// Limit each IP to 100 requests per 10 minutes
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 100,
  message: "Too many requests from this IP, please try again later",
});
app.use("/api", limiter); // Apply to all API routes

// Connect to Database
connectDB();

// ROUTES
// This prefixes all auth routes with "/api/auth"
app.use("/api/auth",authRoutes);
// This prefixes all products routes with "/api/products"
app.use("/api/products",productRoutes);

// SWAGGER DOCUMENTATION
// This prefixes all docs routes with "/api-docs"
app.use("/api-docs",swaggerUi.serve,swaggerUi.setup(swaggerSpec));

export default app;
