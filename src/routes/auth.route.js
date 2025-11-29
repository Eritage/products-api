import express from "express";
import { register, login } from "../controllers/auth.controller.js";

const router = express.Router();

/**
 * @swagger
 * /api/auth/register:
 * post:
 * summary: Register a new user
 * tags: [Auth]
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - username
 * - email
 * - password
 * properties:
 * username:
 * type: string
 * email:
 * type: string
 * password:
 * type: string
 * responses:
 * 201:
 * description: User created successfully
 * 400:
 * description: User already exists
 */
// Route: POST /api/auth/register
router.post("/register", register);

/**
 * @swagger
 * /api/auth/login:                <-- The URL
 * post:                         <-- The Method (GET, POST, etc)
 * summary: Login to App       <-- Short description
 * tags: [Auth]                <-- Groups it under "Auth" section
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * email:            <-- Input Field 1
 * type: string
 * example: test@gmail.com
 * password:         <-- Input Field 2
 * type: string
 * example: 123456
 * responses:
 * 200:                      <-- What happens on Success?
 * description: Login Successful
 * 401:                      <-- What happens on Failure?
 * description: Wrong Password
 */
// Route: POST /api/auth/login
router.post("/login", login);

export default router;
