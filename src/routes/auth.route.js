import express from "express";
import passport from "passport";
import { register, login, googleAuthCallback } from "../controllers/auth.controller.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: User Auth
 *   description: API endpoints for user authentication
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [User Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: testimony
 *               email:
 *                 type: string
 *                 example: testimony@gmail.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: number
 *                   example: 201
 *                 message:
 *                   type: string
 *                   example: User registered successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     token:
 *                       type: string
 *                       example: jwt_token_here
 *
 *       400:
 *         description: User already exists with this email
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "User already exists"
 *                 data:
 *                   type: null
 *                   example: null

 *
 *       401:
 *         description: User data is invalid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 statusCode:
 *                   type: number
 *                   example: 400
 *                 message:
 *                   type: string
 *                   example: invalid user data
 *                 data:
 *                   type: "null"
 *
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 statusCode:
 *                   type: number
 *                   example: 500
 *                 message:
 *                   type: string
 *                   example: Internal server error
 */
router.post("/register", register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login and get access token
 *     tags: [User Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: testimony@gmail.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         username:
 *                           type: string
 *                         email:
 *                           type: string
 *                         token:
 *                           type: string
 *                           example: jwt_token_here
 *
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 statusCode:
 *                   type: number
 *                   example: 401
 *                 message:
 *                   type: string
 *                   example: Invalid credentials
 *                 data:
 *                   type: "null"
 *
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 statusCode:
 *                   type: number
 *                   example: 500
 *                 message:
 *                   type: string
 *                   example: Internal server error
 */
router.post("/login", login);

/**
 * @swagger
 * tags:
 *   name: User Google Auth
 *   description: API endpoints for user authentication
 */

/**
 * @swagger
 * /api/auth/google:
 *   get:
 *     summary: Initiate Google OAuth authentication
 *     description: Redirects user to Google's OAuth consent screen. After user authorizes, Google will redirect back to /api/auth/google/callback
 *     tags: [User Google Auth]
 *     responses:
 *       302:
 *         description: Redirect to Google OAuth consent screen
 *         headers:
 *           Location:
 *             schema:
 *               type: string
 *               example: "https://accounts.google.com/o/oauth2/v2/auth?client_id=..."
 *             description: Redirects to Google's authorization page
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               example: "Redirecting to Google..."
 */
// description: Auth with Google
// route: GET /api/auth/google
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

/**
 * @swagger
 * /api/auth/google/callback:
 *   get:
 *     summary: Google OAuth callback endpoint
 *     description: Handles the callback from Google OAuth authentication. This endpoint is called by Google after user authorizes the app. It generates a JWT token and redirects to the frontend with the token.
 *     tags: [User Google Auth]
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Authorization code from Google (automatically provided by Google OAuth)
 *         example: "4/0AY0e-g7..."
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: State parameter for security (automatically provided by Google OAuth)
 *     responses:
 *       302:
 *         description: Redirect to frontend with token on success
 *         headers:
 *           Location:
 *             schema:
 *               type: string
 *               example: "http://localhost:5173/login-success?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *             description: Redirects to frontend success page with JWT token in query parameter
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               example: "Redirecting..."
 *       302 (Error):
 *         description: Redirect to frontend login page with error on failure
 *         headers:
 *           Location:
 *             schema:
 *               type: string
 *               example: "http://localhost:5173/login?error=GoogleAuthFailed"
 *             description: Redirects to frontend login page with error message
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               example: "Redirecting..."
 */
// description: Google auth callback
// route: GET /api/auth/google/callback
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/login" }),
  googleAuthCallback
);

export default router;
