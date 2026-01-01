import request from "supertest";
import {
  describe,
  test,
  expect,
  beforeEach,
  beforeAll,
  afterAll,
} from "@jest/globals"; // FIX: Manual Import
import app from "../src/app.js";
import Product from "../src/models/product.model.js";
import User from "../src/models/user.model.js";
import { connectDB, disconnectDB, clearDB } from "./setUp.js";

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

describe("Product API", () => {
  let authToken;
  let userId;
  let productId;

  // Helper function to create authenticated user
  const createAuthUser = async () => {
    const response = await request(app).post("/api/auth/register").send({
      username: "testUser",
      email: "test@example.com",
      password: "password123",
    });

    authToken = response.body.data.token;
    userId = response.body.data._id;
  };

  // Helper function to create test product
  const createTestProduct = async () => {
    const product = await Product.create({
      user: userId,
      name: "Test Product",
      price: 99.99,
      description: "Test description",
      category: "Electronics",
      countInStock: 10,
      image: "https://via.placeholder.com/150",
    });
    productId = product._id;
    return product;
  };

  // ==================== GET /api/products ====================
  describe("GET /api/products", () => {
    beforeEach(async () => {
      await createAuthUser();
      // Create multiple products for testing
      await Product.create([
        {
          user: userId,
          name: "iPhone 15",
          price: 999,
          description: "Latest iPhone",
          category: "Electronics",
          countInStock: 10,
          image: "https://via.placeholder.com/150",
        },
        {
          user: userId,
          name: "Samsung Galaxy",
          price: 899,
          description: "Latest Samsung",
          category: "Electronics",
          countInStock: 5,
          image: "https://via.placeholder.com/150",
        },
        {
          user: userId,
          name: "MacBook Pro",
          price: 1999,
          description: "Latest MacBook",
          category: "Electronics",
          countInStock: 3,
          image: "https://via.placeholder.com/150",
        },
      ]);
    });

    test("should get all products", async () => {
      const response = await request(app).get("/api/products");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.message).toBe("Products fetched successfully");
      expect(response.body.pagination).toHaveProperty("page");
      expect(response.body.pagination).toHaveProperty("pages");
      expect(response.body.pagination).toHaveProperty("total");
    });

    test("should search products by keyword", async () => {
      const response = await request(app).get("/api/products?keyword=iPhone");

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].name).toContain("iPhone");
    });

    test("should paginate products", async () => {
      // Create more products to test pagination
      const products = Array.from({ length: 10 }, (_, i) => ({
        user: userId,
        name: `Product ${i}`,
        price: 100 + i,
        description: `Description ${i}`,
        category: "Electronics",
        countInStock: 5,
        image: "https://via.placeholder.com/150",
      }));
      await Product.insertMany(products);

      // Get page 2
      const response = await request(app).get("/api/products?page=2");

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(2);
      expect(response.body.data.length).toBeLessThanOrEqual(4); // pageSize is 4
    });

    test("should return empty array when no products exist", async () => {
      await Product.deleteMany({});

      const response = await request(app).get("/api/products");

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(0);
      expect(response.body.pagination.total).toBe(0);
    });
  });

  // ==================== GET /api/products/:id ====================
  describe("GET /api/products/:id", () => {
    beforeEach(async () => {
      await createAuthUser();
      await createTestProduct();
    });

    test("should get product by ID", async () => {
      const response = await request(app).get(`/api/products/${productId}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(true);
      expect(response.body.data.name).toBe("Test Product");
      expect(response.body.data.price).toBe(99.99);
    });

    test("should return 404 for non-existent product", async () => {
      const fakeId = "507f1f77bcf86cd799439011";
      const response = await request(app).get(`/api/products/${fakeId}`);

      expect(response.status).toBe(404);
      expect(response.body.status).toBe(false);
      expect(response.body.message).toBe("Product not found");
    });

    test("should return 500 for invalid MongoDB ID", async () => {
      const response = await request(app).get("/api/products/invalid-id");

      expect(response.status).toBe(500);
    });
  });

  // ==================== POST /api/products ====================
  describe("POST /api/products", () => {
    beforeEach(async () => {
      await createAuthUser();
    });

    test("should create product with valid data", async () => {
      const productData = {
        name: "New Product",
        price: 149.99,
        description: "A new product",
        category: "Electronics",
        countInStock: 20,
      };

      const response = await request(app)
        .post("/api/products")
        .set("Authorization", `Bearer ${authToken}`)
        .send(productData);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe(true);
      expect(response.body.message).toBe("Products created successfully");
      expect(response.body.data.name).toBe("New Product");
      expect(response.body.data.price).toBe(149.99);
      expect(response.body.data.user.toString()).toBe(userId);

      // Verify in database
      const product = await Product.findById(response.body.data._id);
      expect(product).toBeTruthy();
      expect(product.name).toBe("New Product");
    });

    test("should use placeholder image if no file uploaded", async () => {
      const productData = {
        name: "No Image Product",
        price: 99.99,
        description: "Product without image",
        category: "Electronics",
        countInStock: 5,
      };

      const response = await request(app)
        .post("/api/products")
        .set("Authorization", `Bearer ${authToken}`)
        .send(productData);

      expect(response.status).toBe(201);
      expect(response.body.data.image).toBe("https://via.placeholder.com/150");
    });

    test("should fail without authentication", async () => {
      const productData = {
        name: "Unauthorized Product",
        price: 99.99,
        description: "Should fail",
        category: "Electronics",
        countInStock: 5,
      };

      const response = await request(app)
        .post("/api/products")
        .send(productData);

      expect(response.status).toBe(401);
    });

    test("should fail with missing required fields", async () => {
      const incompleteData = {
        name: "Incomplete Product",
        // Missing price, description, category, countInStock
      };

      const response = await request(app)
        .post("/api/products")
        .set("Authorization", `Bearer ${authToken}`)
        .send(incompleteData);

      expect(response.status).toBe(500); // Mongoose validation error
    });
  });

  // ==================== PUT /api/products/:id ====================
  describe("PUT /api/products/:id", () => {
    beforeEach(async () => {
      await createAuthUser();
      await createTestProduct();
    });

    test("should update product as owner", async () => {
      const updates = {
        name: "Updated Product",
        price: 199.99,
        description: "Updated description",
      };

      const response = await request(app)
        .put(`/api/products/${productId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(true);
      expect(response.body.data.name).toBe("Updated Product");
      expect(response.body.data.price).toBe(199.99);

      // Verify in database
      const product = await Product.findById(productId);
      expect(product.name).toBe("Updated Product");
      expect(product.price).toBe(199.99);
    });

    test("should not update product as non-owner", async () => {
      // Create another user
      const otherUser = await request(app).post("/api/auth/register").send({
        username: "otherUser",
        email: "other@example.com",
        password: "password123",
      });

      const otherToken = otherUser.body.data.token;

      const response = await request(app)
        .put(`/api/products/${productId}`)
        .set("Authorization", `Bearer ${otherToken}`)
        .send({ name: "Hacked Product" });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Not authorized to edit this product");

      // Verify product unchanged
      const product = await Product.findById(productId);
      expect(product.name).toBe("Test Product"); // Original name
    });

    test("should update product as admin", async () => {
      // Create admin user
      const adminUser = await User.create({
        username: "admin",
        email: "admin@example.com",
        password: "adminPass",
        isAdmin: true,
      });

      // Login as admin
      const adminLogin = await request(app).post("/api/auth/login").send({
        email: "admin@example.com",
        password: "adminPass",
      });

      const adminToken = adminLogin.body.data.token;

      const response = await request(app)
        .put(`/api/products/${productId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Admin Updated" });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe("Admin Updated");

      expect(adminUser.isAdmin).toBe(true);
      expect(response.body.data.user.toString()).not.toBe(
        adminUser._id.toString()
      );
    });

    test("should return 404 for non-existent product", async () => {
      const fakeId = "507f1f77bcf86cd799439011";

      const response = await request(app)
        .put(`/api/products/${fakeId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Updated" });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Product not found");
    });
  });

  // ==================== POST /api/products/:id/reviews ====================
  describe("POST /api/products/:id/reviews", () => {
    beforeEach(async () => {
      await createAuthUser();
      await createTestProduct();
    });

    test("should create review for product", async () => {
      const reviewData = {
        rating: 5,
        comment: "Excellent product!",
      };

      const response = await request(app)
        .post(`/api/products/${productId}/reviews`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(reviewData);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe(true);
      expect(response.body.message).toBe("Review added");
      expect(response.body.data.reviews).toHaveLength(1);
      expect(response.body.data.reviews[0].rating).toBe(5);
      expect(response.body.data.reviews[0].comment).toBe("Excellent product!");
      expect(response.body.data.numReviews).toBe(1);
      expect(response.body.data.rating).toBe(5);
    });

    test("should not allow duplicate reviews from same user", async () => {
      // First review
      await request(app)
        .post(`/api/products/${productId}/reviews`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ rating: 5, comment: "Great!" });

      // Try second review
      const response = await request(app)
        .post(`/api/products/${productId}/reviews`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ rating: 4, comment: "Still great!" });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        "Product already reviewed by this user"
      );
    });

    test("should calculate average rating correctly", async () => {
      // First review - 5 stars
      await request(app)
        .post(`/api/products/${productId}/reviews`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ rating: 5, comment: "Excellent!" });

      // Create second user and review - 3 stars
      const user2 = await request(app).post("/api/auth/register").send({
        username: "user2",
        email: "user2@example.com",
        password: "password123",
      });

      const response = await request(app)
        .post(`/api/products/${productId}/reviews`)
        .set("Authorization", `Bearer ${user2.body.data.token}`)
        .send({ rating: 3, comment: "Good!" });

      // Average should be (5 + 3) / 2 = 4
      expect(response.body.data.rating).toBe(4);
      expect(response.body.data.numReviews).toBe(2);
    });

    test("should fail without authentication", async () => {
      const response = await request(app)
        .post(`/api/products/${productId}/reviews`)
        .send({ rating: 5, comment: "Great!" });

      expect(response.status).toBe(401);
    });

    test("should return 404 for non-existent product", async () => {
      const fakeId = "507f1f77bcf86cd799439011";

      const response = await request(app)
        .post(`/api/products/${fakeId}/reviews`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ rating: 5, comment: "Great!" });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Product not found");
    });
  });

  // ==================== DELETE /api/products/:id ====================
  describe("DELETE /api/products/:id", () => {
    beforeEach(async () => {
      await createAuthUser();
      await User.findOneAndUpdate({}, { isAdmin: true });
      await createTestProduct();
    });

    test("should delete product", async () => {
      const response = await request(app)
        .delete(`/api/products/${productId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(true);
      expect(response.body.message).toBe("Product deleted successfully");

      // Verify deletion in database
      const product = await Product.findById(productId);
      expect(product).toBeNull();
    });

    test("should return 404 for non-existent product", async () => {
      const fakeId = "507f1f77bcf86cd799439011";

      const response = await request(app)
        .delete(`/api/products/${fakeId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Product not found");
    });

    test("should fail without authentication", async () => {
      const response = await request(app).delete(`/api/products/${productId}`);

      expect(response.status).toBe(401);
    });
  });
});
