import express from "express";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.route.js";
import productRoutes from "./routes/product.route.js";
import orderRoutes from "./routes/order.route.js";
import paymentRoutes from "./routes/payment.route.js";
import swaggerSpec from "./config/swagger.js";
import cors from "cors";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import { rateLimit } from "express-rate-limit";
import hpp from "hpp";
import passport from "passport";
import passportConfig from "./config/passport.js";

// Load env vars
dotenv.config();

// Passport Config
passportConfig(passport);

// Initialize Express
const app = express();

// Helmet: Secure HTTP Headers
// It hides "X-Powered-By: Express" and sets security headers
app.use(helmet());

// Only allow requests from your specific Frontend URL
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:5173", // Fallback to local Vite default
  credentials: true, // Allow cookies to be sent
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Body Parser: Reads JSON data into req.body
// We add a custom condition to skip JSON parsing for the Stripe Webhook route
app.use((req, res, next) => {
  if (req.originalUrl === "/api/payment/webhook") {
    next(); // Skip global JSON parser
  } else {
    express.json()(req, res, next); // Run global JSON parser
  }
});
//initialize passport middleware
app.use(passport.initialize());

// Add this manually to unlock req.query before sanitization
// Express 5 makes req.query read-only, but express-mongo-sanitize tries to overwrite it.
// This is required until the library is updated for Express 5.
app.use((req, res, next) => {
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
app.use("/api/auth", authRoutes);
// This prefixes all products routes with "/api/products"
app.use("/api/products", productRoutes);
// This prefixes all orders routes with "/api/orders"
app.use("/api/orders", orderRoutes);
// This prefixes all payment routes with "/api/payment"
app.use("/api/payment", paymentRoutes);

// SWAGGER DOCUMENTATION
// This prefixes all docs routes with "/api-docs"
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

export default app;
