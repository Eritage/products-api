// __tests__/auth.test.js
import request from "supertest";
import { describe, test, expect, beforeEach,beforeAll,afterAll } from "@jest/globals"; // FIX: Manual Import
import app from "../src/app.js";
import User from "../src/models/user.model.js";
import { connectDB,disconnectDB,clearDB } from "./setUp.js";

// Setup database connection
beforeAll(async () => {
  await connectDB();
});

// Close database connection
afterAll(async () => {
  await disconnectDB();
});

// Clear database before each test
beforeEach(async () => {
  await clearDB();
});

describe("POST /api/auth/register", () => {
  test("should register a new user successfully", async () => {
    const userData = {
      username: "testUser",
      email: "test@example.com",
      password: "password123",
    };

    const response = await request(app)
      .post("/api/auth/register")
      .send(userData);

    // Check response
    expect(response.status).toBe(201);
    expect(response.body.status).toBe(true);
    expect(response.body.message).toBe("User registered successfully");
    expect(response.body.data).toHaveProperty("token");
    expect(response.body.data.email).toBe("test@example.com");
    expect(response.body.data.username).toBe("testUser");

    // Check database
    const user = await User.findOne({ email: "test@example.com" });
    expect(user).toBeTruthy();
    expect(user.password).not.toBe("password123"); // Should be hashed
  });

  test("should not register duplicate email", async () => {
    // First registration
    await request(app).post("/api/auth/register").send({
      username: "user1",
      email: "test@example.com",
      password: "password123",
    });

    // Try duplicate
    const response = await request(app).post("/api/auth/register").send({
      username: "user2",
      email: "test@example.com",
      password: "password456",
    });

    expect(response.status).toBe(400);
    expect(response.body.status).toBe(false);
    expect(response.body.message).toBe("User already exists");
  });

  test("should reject registration without email", async () => {
    const response = await request(app).post("/api/auth/register").send({
      username: "testUser",
      password: "password123",
    });

    expect(response.status).toBe(400);
  });

  test("should reject registration without password", async () => {
    const response = await request(app).post("/api/auth/register").send({
      username: "testUser",
      email: "test@example.com",
    });

    expect(response.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    // Create a test user before each login test
    await request(app).post("/api/auth/register").send({
      username: "testUser",
      email: "test@example.com",
      password: "password123",
    });
  });

  test("should login with valid credentials", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "test@example.com",
      password: "password123",
    });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe(true);
    expect(response.body.message).toBe("User logged in successfully");
    expect(response.body.data).toHaveProperty("token");
    expect(response.body.data.email).toBe("test@example.com");
  });

  test("should not login with wrong password", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "test@example.com",
      password: "wrongPassword",
    });

    expect(response.status).toBe(401);
    expect(response.body.status).toBe(false);
    expect(response.body.message).toBe("Invalid credentials");
  });

  test("should not login with non-existent email", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "nonexistent@example.com",
      password: "password123",
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid credentials");
  });

  test("should reject login without email", async () => {
    const response = await request(app).post("/api/auth/login").send({
      password: "password123",
    });

    expect(response.status).toBe(400);
  });

  test("should reject login without password", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "test@example.com",
    });

    expect(response.status).toBe(400);
  });

});
