// __tests__/payment.test.js
import {
  jest,
  beforeAll,
  afterAll,
  beforeEach,
  describe,
  test,
  expect,
} from "@jest/globals";

// 1. MOCK BEFORE IMPORTS
const mockPaymentIntentsCreate = jest.fn();
const mockConstructEvent = jest.fn();

await jest.unstable_mockModule("stripe", () => ({
  default: jest.fn(() => ({
    paymentIntents: {
      create: mockPaymentIntentsCreate,
    },
    webhooks: {
      constructEvent: mockConstructEvent,
    },
  })),
}));

await jest.unstable_mockModule("../src/utils/sendEmail.js", () => ({
  default: jest.fn(),
}));

// 2. NOW IMPORT MODULES
const { default: request } = await import("supertest");
const { default: app } = await import("../src/app.js");
const { default: Order } = await import("../src/models/order.model.js");
const { default: Product } = await import("../src/models/product.model.js");
const { connectDB, disconnectDB, clearDB } = await import("./setUp.js");

// 3. SETUP
beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await disconnectDB();
});

beforeEach(async () => {
  await clearDB();
  jest.clearAllMocks();
});

// 4. TESTS
describe("Payment API", () => {
  let authToken;
  let userId;
  let productId;
  let orderId;

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

  const createTestOrder = async () => {
    const product = await Product.create({
      user: userId,
      name: "Test Product",
      price: 100.0,
      description: "Desc",
      category: "Cat",
      countInStock: 10,
    });
    productId = product._id;

    const order = await Order.create({
      user: userId,
      orderItems: [
        {
          name: "Test Product",
          quantity: 1,
          image: "img.jpg",
          price: 100.0,
          product: productId,
        },
      ],
      shippingAddress: {
        address: "123 St",
        city: "Test",
        postalCode: "12345",
        country: "USA",
      },
      paymentMethod: "Stripe",
      itemsPrice: 100.0,
      taxPrice: 0,
      shippingPrice: 0,
      totalPrice: 100.0,
      isPaid: false,
    });
    orderId = order._id;
    return order;
  };

  describe("GET /api/payment/config", () => {
    test("should return stripe publishable key", async () => {
      process.env.STRIPE_PUBLISHABLE_KEY = "pk_test_12345";

      const response = await request(app).get("/api/payment/config");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(true);
      expect(response.body.publishableKey).toBe("pk_test_12345");
    });
  });

  describe("POST /api/payment/create-payment-intent", () => {
    beforeEach(async () => {
      await createAuthUser();
      await createTestOrder();

      mockPaymentIntentsCreate.mockResolvedValue({
        id: "pi_test_123456789",
        client_secret: "secret_test_123",
        amount: 10000,
        currency: "usd",
      });
    });

    test("should create payment intent for valid order", async () => {
      const response = await request(app)
        .post("/api/payment/create-payment-intent")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ orderId: orderId.toString() });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(true);
      expect(response.body.clientSecret).toBe("secret_test_123");
      expect(response.body.amount).toBe(100);

      expect(mockPaymentIntentsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 10000,
          metadata: { orderId: orderId.toString() },
        })
      );
    });

    test("should fail if order does not exist", async () => {
      const fakeId = "507f1f77bcf86cd799439011";

      const response = await request(app)
        .post("/api/payment/create-payment-intent")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ orderId: fakeId });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Order not found");
    });

    test("should fail if user does not own the order", async () => {
      const hackerResponse = await request(app)
        .post("/api/auth/register")
        .send({
          username: "hacker",
          email: "hacker@test.com",
          password: "password123",
        });
      const hackerToken = hackerResponse.body.data.token;

      const response = await request(app)
        .post("/api/payment/create-payment-intent")
        .set("Authorization", `Bearer ${hackerToken}`)
        .send({ orderId: orderId.toString() });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe(
        "Not authorized to pay for this order"
      );
    });
  });

  describe("POST /api/payment/webhook", () => {
    beforeEach(async () => {
      await createAuthUser();
      await createTestOrder();
    });

    test("should update order to paid on success event", async () => {
      mockConstructEvent.mockReturnValue({
        type: "payment_intent.succeeded",
        data: {
          object: {
            id: "pi_test_123",
            amount: 10000,
            status: "succeeded",
            metadata: {
              orderId: orderId.toString(),
            },
            receipt_email: "test@example.com",
          },
        },
      });

      const response = await request(app)
        .post("/api/payment/webhook")
        .set("stripe-signature", "fake_signature")
        .send({ some: "data" });

      expect(response.status).toBe(200);

      const updatedOrder = await Order.findById(orderId);
      expect(updatedOrder.isPaid).toBe(true);
      expect(updatedOrder.paidAt).toBeDefined();
      expect(updatedOrder.paymentResult.id).toBe("pi_test_123");
    });

    test("should return 400 if signature verification fails", async () => {
      mockConstructEvent.mockImplementation(() => {
        throw new Error("Invalid signature");
      });

      const response = await request(app)
        .post("/api/payment/webhook")
        .set("stripe-signature", "bad_signature")
        .send({});

      expect(response.status).toBe(400);
      expect(response.text).toContain("Webhook Error");

      const order = await Order.findById(orderId);
      expect(order.isPaid).toBe(false);
    });
  });
});
