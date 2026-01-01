import request from "supertest";
import {
  jest,
  describe,
  test,
  expect,
  beforeEach,
  beforeAll,
  afterAll,
} from "@jest/globals";
import app from "../src/app.js";
import User from "../src/models/user.model.js";
import Product from "../src/models/product.model.js";
import Order from "../src/models/order.model.js";
import { connectDB, disconnectDB, clearDB } from "./setUp.js";

// --- MOCK EMAIL SERVICE ---
// This prevents actual emails from being sent during tests
jest.mock("../src/utils/sendEmail.js", () => jest.fn());

// Setup and teardown
beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await disconnectDB();
});

beforeEach(async () => {
  await clearDB();
  jest.clearAllMocks(); // Clear email mock calls
});

describe("Order API", () => {
  let authToken;
  let userId;
  let productId;
  let orderId;

  // Helper: Create Authenticated User
  const createAuthUser = async () => {
    const response = await request(app).post("/api/auth/register").send({
      username: "testUser",
      email: "test@example.com",
      password: "password123",
    });

    authToken = response.body.data.token;
    userId = response.body.data._id;
    return response.body.data;
  };

  // Helper: Create Admin User
  async () => {
    // 1. Create user
    await createAuthUser();
    // 2. Force update to Admin in DB
    await User.findByIdAndUpdate(userId, { isAdmin: true });
    // 3. Return the token so we can use it in the test
    return authToken;
  };

  // Helper: Create Product
  const createTestProduct = async (stock = 10) => {
    const product = await Product.create({
      user: userId,
      name: "Test Product",
      price: 100.0,
      description: "Test description",
      category: "Electronics",
      countInStock: stock,
      image: "https://via.placeholder.com/150",
    });
    productId = product._id;
    return product;
  };

  // Helper: Create Order directly in DB
  const createTestOrder = async (uId = userId) => {
    const order = await Order.create({
      user: uId,
      orderItems: [
        {
          name: "Test Product",
          quantity: 1,
          image: "https://via.placeholder.com/150",
          price: 100.0,
          product: productId,
        },
      ],
      shippingAddress: {
        address: "123 Main St",
        city: "New York",
        postalCode: "10001",
        country: "USA",
      },
      paymentMethod: "PayPal",
      itemsPrice: 100.0,
      taxPrice: 10.0,
      shippingPrice: 10.0,
      totalPrice: 120.0,
      isPaid: true,
      paidAt: Date.now(),
    });
    orderId = order._id;
    return order;
  };

  // ==================== POST /api/orders ====================
  describe("POST /api/orders", () => {
    beforeEach(async () => {
      await createAuthUser();
      await createTestProduct(10); // Stock is 10
    });

    test("should create order and reduce stock", async () => {
      const orderData = {
        orderItems: [{ product: productId, quantity: 2 }],
        shippingAddress: {
          address: "123 Main St",
          city: "Lagos",
          postalCode: "10001",
          country: "Nigeria",
        },
        paymentMethod: "Stripe",
      };

      const response = await request(app)
        .post("/api/orders")
        .set("Authorization", `Bearer ${authToken}`)
        .send(orderData);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe(true);
      expect(response.body.message).toBe("Order created successfully");

      // Check calculated prices (100 * 2 = 200)
      expect(response.body.data.itemsPrice).toBe(200);
      expect(response.body.data.taxPrice).toBe(20); // 10%

      // Verify Database: Stock should be reduced (10 - 2 = 8)
      const updatedProduct = await Product.findById(productId);
      expect(updatedProduct.countInStock).toBe(8);
    });

    test("should fail if product is out of stock", async () => {
      const orderData = {
        orderItems: [
          { product: productId, quantity: 15 }, // Asking for 15, have 10
        ],
        shippingAddress: { address: "Test" },
        paymentMethod: "Stripe",
      };

      const response = await request(app)
        .post("/api/orders")
        .set("Authorization", `Bearer ${authToken}`)
        .send(orderData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("is out of stock");
    });

    test("should fail if no order items provided", async () => {
      const response = await request(app)
        .post("/api/orders")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ orderItems: [] });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("No order items");
    });
  });

  // ==================== GET /api/orders/myOrders ====================
  describe("GET /api/orders/myOrders", () => {
    test("should get logged in users orders", async () => {
      await createAuthUser();
      await createTestProduct();
      await createTestOrder(); // Create order for this user

      const response = await request(app)
        .get("/api/orders/myOrders")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]._id).toBe(orderId.toString());
    });
  });

  // ==================== GET /api/orders/:id ====================
  describe("GET /api/orders/:id", () => {
    beforeEach(async () => {
      await createAuthUser();
      await createTestProduct();
      await createTestOrder();
    });

    test("should get order by ID", async () => {
      const response = await request(app)
        .get(`/api/orders/${orderId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(true);
      expect(response.body.data._id).toBe(orderId.toString());
    });

    test("should prevent user from viewing another users order", async () => {
      // 1. Create a second user
      const user2Response = await request(app)
        .post("/api/auth/register")
        .send({
          username: "hacker",
          email: "hack@test.com",
          password: "password123",
        });
      const hackerToken = user2Response.body.data.token;

      // 2. Try to access the first user's order
      const response = await request(app)
        .get(`/api/orders/${orderId}`)
        .set("Authorization", `Bearer ${hackerToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Not authorized to view this order");
    });

    test("should allow admin to view any order", async () => {
      // 1. Create admin
      const adminResponse = await request(app)
        .post("/api/auth/register")
        .send({
          username: "admin",
          email: "admin@test.com",
          password: "password123",
        });

      const adminId = adminResponse.body.data._id;
      const adminToken = adminResponse.body.data.token;

      // Make them admin
      await User.findByIdAndUpdate(adminId, { isAdmin: true });

      // 2. Try to access the first user's order
      const response = await request(app)
        .get(`/api/orders/${orderId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(true);
    });

    test("should return 404 for non-existent order", async () => {
      const fakeId = "507f1f77bcf86cd799439011";
      const response = await request(app)
        .get(`/api/orders/${fakeId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Order not found");
    });
  });

  // ==================== GET /api/orders (Admin) ====================
  describe("GET /api/orders", () => {
    beforeEach(async () => {
      await createAuthUser(); // Creates standard user
      await createTestProduct();
      await createTestOrder();
    });

    test("should get all orders as admin", async () => {
      // Upgrade user to admin
      await User.findByIdAndUpdate(userId, { isAdmin: true });

      const response = await request(app)
        .get("/api/orders")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });

    // NOTE: This assumes your route uses adminMiddleware.
    // If not, this test might fail (return 200 instead of 401).
    test("should fail for non-admin user", async () => {
      // Downgrade to regular user (just to be safe, though createAuthUser makes reg user)
      await User.findByIdAndUpdate(userId, { isAdmin: false });

      const response = await request(app)
        .get("/api/orders")
        .set("Authorization", `Bearer ${authToken}`);

      // Expecting 401 Unauthorized or 403 Forbidden depending on your middleware
      expect([401, 403]).toContain(response.status);
    });
  });

  // ==================== PUT /api/orders/:id/deliver (Admin) ====================
  describe("PUT /api/orders/:id/deliver", () => {
    beforeEach(async () => {
      await createAuthUser();
      await createTestProduct();
      await createTestOrder();
    });

    test("should mark order as delivered as admin", async () => {
      // Upgrade to Admin
      await User.findByIdAndUpdate(userId, { isAdmin: true });

      const response = await request(app)
        .put(`/api/orders/${orderId}/deliver`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(true);
      expect(response.body.data.isDelivered).toBe(true);
      expect(response.body.data.deliveredAt).toBeDefined();
    });

    test("should fail for non-admin user", async () => {
      // Ensure regular user
      await User.findByIdAndUpdate(userId, { isAdmin: false });

      const response = await request(app)
        .put(`/api/orders/${orderId}/deliver`)
        .set("Authorization", `Bearer ${authToken}`);

      expect([401, 403]).toContain(response.status);
    });
  });
});
