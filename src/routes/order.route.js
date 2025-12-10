import express from "express";
import {
  addOrderItems,
  getOrderById,
  getMyOrders,
  getOrders,
  updateOrderToDelivered,
} from "../controllers/order.controller.js";
import { protect, admin } from "../middlewares/auth.middleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Orders Auth
 *   description: API endpoints for orders authentication
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Order:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *         user:
 *           type: string
 *           example: "507f1f77bcf86cd799439012"
 *         orderItems:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               product:
 *                 type: string
 *                 example: "507f1f77bcf86cd799439013"
 *               name:
 *                 type: string
 *                 example: "iPhone 15"
 *               quantity:
 *                 type: number
 *                 example: 2
 *               price:
 *                 type: number
 *                 example: 999
 *               image:
 *                 type: string
 *                 example: "https://example.com/image.jpg"
 *         shippingAddress:
 *           type: object
 *           properties:
 *             address:
 *               type: string
 *               example: "123 Main St"
 *             city:
 *               type: string
 *               example: "New York"
 *             postalCode:
 *               type: string
 *               example: "10001"
 *             country:
 *               type: string
 *               example: "USA"
 *         paymentMethod:
 *           type: string
 *           example: "PayPal"
 *         paymentResult:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             status:
 *               type: string
 *             update_time:
 *               type: string
 *             email_address:
 *               type: string
 *         itemsPrice:
 *           type: number
 *           example: 1998
 *         taxPrice:
 *           type: number
 *           example: 199.8
 *         shippingPrice:
 *           type: number
 *           example: 10
 *         totalPrice:
 *           type: number
 *           example: 2207.8
 *         isPaid:
 *           type: boolean
 *           example: false
 *         paidAt:
 *           type: string
 *           format: date-time
 *         isDelivered:
 *           type: boolean
 *           example: false
 *         deliveredAt:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a new order
 *     description: |
 *       Create a new order with items from cart. Backend validates products, checks stock, calculates all prices for security, and updates inventory.
 *
 *       **Security Features:**
 *       - All prices are calculated on the backend using database values
 *       - Product availability is verified in real-time
 *       - Stock is automatically decremented after order creation
 *
 *       **Price Calculation:**
 *       - Items Price: Sum of (product price × quantity) from database
 *       - Tax: 10% of items price
 *       - Shipping: $10 (Free for orders over $100)
 *       - Total: Items + Tax + Shipping
 *
 *       **Email Notification:**
 *       - Subject: "Order Confirmation - Products API"
 *       - Recipient: Customer's email address
 *       - Content: Order ID, total price, and shipping notification
 *
 *       **Note:** The endpoint will succeed even if email delivery fails. Email errors are logged server-side but do not affect the order creation.
 *     tags: [Orders Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderItems
 *               - shippingAddress
 *               - paymentMethod
 *             properties:
 *               orderItems:
 *                 type: array
 *                 description: Array of products to order (prices calculated by backend for security)
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - product
 *                     - quantity
 *                   properties:
 *                     product:
 *                       type: string
 *                       description: Product ID from database
 *                       example: "507f1f77bcf86cd799439013"
 *                     quantity:
 *                       type: integer
 *                       description: Number of items to order
 *                       example: 2
 *                       minimum: 1
 *               shippingAddress:
 *                 type: object
 *                 required:
 *                   - address
 *                   - city
 *                   - postalCode
 *                   - country
 *                 properties:
 *                   address:
 *                     type: string
 *                     description: Street address
 *                     example: "123 Main Street"
 *                   city:
 *                     type: string
 *                     description: City name
 *                     example: "New York"
 *                   postalCode:
 *                     type: string
 *                     description: Postal/ZIP code
 *                     example: "10001"
 *                   country:
 *                     type: string
 *                     description: Country name
 *                     example: "USA"
 *               paymentMethod:
 *                 type: string
 *                 description: Payment method selected by user
 *                 example: "PayPal"
 *                 enum: [PayPal, Stripe, Credit Card, Cash on Delivery]
 *           examples:
 *             singleItem:
 *               summary: Order with single item
 *               value:
 *                 orderItems:
 *                   - product: "507f1f77bcf86cd799439013"
 *                     quantity: 1
 *                 shippingAddress:
 *                   address: "123 Main Street"
 *                   city: "New York"
 *                   postalCode: "10001"
 *                   country: "USA"
 *                 paymentMethod: "PayPal"
 *             multipleItems:
 *               summary: Order with multiple items
 *               value:
 *                 orderItems:
 *                   - product: "507f1f77bcf86cd799439013"
 *                     quantity: 2
 *                   - product: "507f1f77bcf86cd799439014"
 *                     quantity: 1
 *                 shippingAddress:
 *                   address: "456 Oak Avenue"
 *                   city: "Los Angeles"
 *                   postalCode: "90001"
 *                   country: "USA"
 *                 paymentMethod: "Credit Card"
 *     responses:
 *       201:
 *         description: Order created successfully, stock updated, and email confirmation sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Order created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "507f1f77bcf86cd799439011"
 *                     user:
 *                       type: string
 *                       example: "507f1f77bcf86cd799439012"
 *                     orderItems:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           product:
 *                             type: string
 *                             example: "507f1f77bcf86cd799439013"
 *                           name:
 *                             type: string
 *                             example: "iPhone 15"
 *                           quantity:
 *                             type: integer
 *                             example: 2
 *                           price:
 *                             type: number
 *                             description: Price per unit (calculated from database)
 *                             example: 999
 *                           image:
 *                             type: string
 *                             example: "https://example.com/iphone.jpg"
 *                     shippingAddress:
 *                       type: object
 *                       properties:
 *                         address:
 *                           type: string
 *                           example: "123 Main Street"
 *                         city:
 *                           type: string
 *                           example: "New York"
 *                         postalCode:
 *                           type: string
 *                           example: "10001"
 *                         country:
 *                           type: string
 *                           example: "USA"
 *                     paymentMethod:
 *                       type: string
 *                       example: "PayPal"
 *                     itemsPrice:
 *                       type: number
 *                       description: Total price of items (calculated by backend)
 *                       example: 1998
 *                     taxPrice:
 *                       type: number
 *                       description: Tax amount - 10% of items price (calculated by backend)
 *                       example: 199.80
 *                     shippingPrice:
 *                       type: number
 *                       description: Shipping cost - $10 or free over $100 (calculated by backend)
 *                       example: 0
 *                     totalPrice:
 *                       type: number
 *                       description: Grand total (calculated by backend)
 *                       example: 2197.80
 *                     isPaid:
 *                       type: boolean
 *                       example: false
 *                     isDelivered:
 *                       type: boolean
 *                       example: false
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T10:30:00.000Z"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T10:30:00.000Z"
 *       400:
 *         description: Bad request - Empty cart or insufficient stock
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
 *                   example: "No order items"
 *                 data:
 *                   type: null
 *                   example: null
 *             examples:
 *               emptyCart:
 *                 summary: Empty cart
 *                 value:
 *                   status: false
 *                   message: "No order items"
 *                   data: null
 *               outOfStock:
 *                 summary: Product out of stock
 *                 value:
 *                   status: false
 *                   message: "iPhone 15 is out of stock"
 *                   data: null
 *       404:
 *         description: Product not found
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
 *                   example: "Product 507f1f77bcf86cd799439013 not found"
 *                 data:
 *                   type: null
 *                   example: null
 *       401:
 *         description: Unauthorized - No token provided
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
 *                   example: "Not authorized, no token"
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
 *                 message:
 *                   type: string
 *                   example: "Error message"
 */
// Route to add items to be ordered[Logged in user]
router.post("/", protect, addOrderItems);

/**
 * @swagger
 * /api/orders/myOrders:
 *   get:
 *     summary: Get logged-in user's orders
 *     tags: [Orders Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User orders fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Users order fetched successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
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
 *                 message:
 *                   type: string
 *                   example: "Error message"
 */
// Route to get a users order[Logged in user]
router.get("/myOrders", protect, getMyOrders);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     description: Get a specific order. User must be the order owner or an admin.
 *     tags: [Orders Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Order fetched successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Order'
 *       403:
 *         description: Not authorized - User is not the order owner or admin
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
 *                   example: "Not authorized to view this order"
 *                 data:
 *                   type: null
 *                   example: null
 *       404:
 *         description: Order not found
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
 *                   example: "Order not found"
 *                 data:
 *                   type: null
 *                   example: null
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
 *                 message:
 *                   type: string
 *                   example: "Error message"
 */
// Route to get order by ID[Owned by user or admin]
router.get("/:id", protect, getOrderById);

/**
 * @swagger
 * tags:
 *   name: Orders Admin Auth
 *   description: API endpoints for orders authentication
 */

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get all orders (Admin only)
 *     tags: [Orders Admin Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All orders fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "All orders fetched successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
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
 *                 message:
 *                   type: string
 *                   example: "Error message"
 */
// Route to get all orders[Admin only]
router.get("/", protect, admin, getOrders);

/**
 * @swagger
 * /api/orders/{id}/deliver:
 *   put:
 *     summary: Update order to delivered (Admin only)
 *     description: |
 *       Marks an order as delivered and sends an email notification to the customer.
 *
 *       **Email Notification:**
 *       - Subject: "Your Order has arrived"
 *       - Recipient: Customer's email address
 *       - Content: Order ID and delivery confirmation
 *
 *       **Note:** The endpoint will succeed even if email delivery fails. Email errors are logged server-side but do not affect the order status update.
 *     tags: [Orders Admin Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Order marked as delivered successfully and email notification sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Order delivered successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "507f1f77bcf86cd799439011"
 *                     isDelivered:
 *                       type: boolean
 *                       example: true
 *                     deliveredAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T14:30:00.000Z"
 *                     orderItems:
 *                       type: array
 *                       items:
 *                         type: object
 *                     shippingAddress:
 *                       type: object
 *                     paymentMethod:
 *                       type: string
 *                     isPaid:
 *                       type: boolean
 *                     totalPrice:
 *                       type: number
 *             examples:
 *               success:
 *                 summary: Order delivered successfully with email notification
 *                 value:
 *                   status: true
 *                   message: "Order delivered successfully"
 *                   data:
 *                     _id: "507f1f77bcf86cd799439011"
 *                     isDelivered: true
 *                     deliveredAt: "2024-01-15T14:30:00.000Z"
 *                     isPaid: true
 *                     totalPrice: 2481.70
 *       404:
 *         description: Order not found
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
 *                   example: "Order not found"
 *                 data:
 *                   type: null
 *                   example: null
 *       401:
 *         description: Unauthorized - No token or invalid token
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
 *                   example: "Not authorized, no token"
 *       403:
 *         description: Forbidden - User is not an admin
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
 *                   example: "Not authorized as an admin"
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
 *                 message:
 *                   type: string
 *                   example: "Error message"
 */
// Route to update order to delivered[Admin only]
router.put("/:id/deliver", protect, admin, updateOrderToDelivered);

export default router;
