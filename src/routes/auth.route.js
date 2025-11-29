import express from "express";
import { register, login } from "../controllers/auth.controller.js";

const router = express.Router();

// Route: POST /api/auth/register
router.post("/register", register);

// Route: POST /api/auth/login
router.post("/login", login);

export default router;
