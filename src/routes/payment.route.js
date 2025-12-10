import express from "express";
import {
  createPaymentIntent,
  getStripeConfig,
  stripeWebhook,
} from "../controllers/payment.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     PaymentIntent:
 *       type: object
 *       properties:
 *         status:
 *           type: boolean
 *           description: Success status of the operation
 *           example: true
 *         clientSecret:
 *           type: string
 *           description: Stripe client secret for frontend payment processing
 *           example: "pi_3ABC123def456_secret_XYZ789ghi012"
 *         amount:
 *           type: number
 *           description: Total amount to be charged in dollars
 *           example: 2197.80
 *
 *     StripeConfig:
 *       type: object
 *       properties:
 *         status:
 *           type: boolean
 *           description: Success status
 *           example: true
 *         publishableKey:
 *           type: string
 *           description: Stripe publishable key for frontend initialization
 *           example: "pk_test_51ABC123..."
 */

/**
 * @swagger
 * tags:
 *   - name: Payment
 *     description: |
 *       Payment processing endpoints using Stripe.
 *
 *       **Complete Payment Flow:**
 *       1. Get Stripe config (GET /api/payment/config) - Frontend initializes Stripe
 *       2. User creates an order (POST /api/orders)
 *       3. Create payment intent (POST /api/payment/create-payment-intent)
 *       4. Frontend uses client secret with Stripe.js to collect payment
 *       5. Stripe processes payment and calls webhook (POST /api/payment/webhook)
 *       6. Webhook updates order status and sends confirmation email
 *
 *       **Security:**
 *       - All amounts are calculated server-side from database
 *       - User authorization is verified before payment
 *       - Stripe handles sensitive card data (PCI compliant)
 *       - Webhooks are verified with Stripe signatures
 */

/**
 * @swagger
 * /api/payment/config:
 *   get:
 *     summary: Get Stripe publishable key
 *     description: |
 *       Returns the Stripe publishable key needed to initialize Stripe.js on the frontend.
 *
 *       **Purpose:**
 *       - Frontend needs this key to initialize Stripe payment elements
 *       - This is a public key, safe to expose to the frontend
 *       - Used to create Stripe.js instance: `const stripe = await loadStripe(publishableKey)`
 *
 *       **Usage on Frontend:**
 *       ```javascript
 *       const response = await fetch('/api/payment/config');
 *       const { publishableKey } = await response.json();
 *       const stripe = await loadStripe(publishableKey);
 *       ```
 *     tags: [Payment]
 *     responses:
 *       200:
 *         description: Stripe publishable key retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StripeConfig'
 *             example:
 *               status: true
 *               publishableKey: "pk_test_51ABC123XYZ456..."
 */
// Public: Get Stripe Publishable Key
router.get("/config", getStripeConfig);

/**
 * @swagger
 * /api/payment/create-payment-intent:
 *   post:
 *     summary: Create a Stripe payment intent for an order
 *     description: |
 *       Creates a Stripe payment intent to process payment for an existing order. This endpoint implements secure payment processing.
 *
 *       **Security Features:**
 *       - Payment amount is calculated from database order (not user input)
 *       - Verifies user owns the order before allowing payment
 *       - Uses Stripe's secure payment intent flow
 *       - Order ID is stored in payment metadata for webhook processing
 *
 *       **Payment Flow:**
 *       1. Client sends order ID to this endpoint
 *       2. Backend fetches order from database and validates ownership
 *       3. Backend calculates amount from database order total
 *       4. Stripe payment intent is created with the secure amount
 *       5. Client secret is returned to frontend
 *       6. Frontend uses client secret with Stripe.js to collect payment details
 *       7. User enters card information in Stripe Elements
 *       8. Stripe processes payment
 *       9. Stripe webhook notifies backend when payment succeeds
 *
 *       **Important:** The amount is NOT accepted from the request body. It is always calculated from the order in the database to prevent price manipulation.
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *             properties:
 *               orderId:
 *                 type: string
 *                 description: The ID of the order to create payment for
 *                 example: "507f1f77bcf86cd799439011"
 *               currency:
 *                 type: string
 *                 description: Currency code (ISO 4217). Defaults to 'usd' if not provided
 *                 example: "usd"
 *                 enum: [usd, eur, gbp, ngn, cad, aud, jpy]
 *                 default: "usd"
 *           examples:
 *             usdPayment:
 *               summary: Create USD payment intent
 *               value:
 *                 orderId: "507f1f77bcf86cd799439011"
 *                 currency: "usd"
 *             ngnPayment:
 *               summary: Create NGN payment intent (Nigerian Naira)
 *               value:
 *                 orderId: "507f1f77bcf86cd799439011"
 *                 currency: "ngn"
 *             defaultCurrency:
 *               summary: Use default currency (USD)
 *               value:
 *                 orderId: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Payment intent created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentIntent'
 *             examples:
 *               success:
 *                 summary: Payment intent created
 *                 value:
 *                   status: true
 *                   clientSecret: "pi_3ABC123def456_secret_XYZ789ghi012"
 *                   amount: 2197.80
 *       400:
 *         description: Bad request - Order ID not provided
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
 *                   example: "Order ID is required"
 *       401:
 *         description: Unauthorized - User does not own the order or not authenticated
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
 *             examples:
 *               notOwner:
 *                 summary: User trying to pay for someone else's order
 *                 value:
 *                   status: false
 *                   message: "Not authorized to pay for this order"
 *               noToken:
 *                 summary: No authentication token provided
 *                 value:
 *                   status: false
 *                   message: "Not authorized, no token"
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
 *       500:
 *         description: Server error or Stripe API error
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
 *             examples:
 *               stripeError:
 *                 summary: Stripe API error
 *                 value:
 *                   status: false
 *                   message: "Invalid API key provided"
 *               serverError:
 *                 summary: General server error
 *                 value:
 *                   status: false
 *                   message: "Internal server error"
 */
// Protected: User must be logged in to start a payment
router.post("/create-payment-intent", protect, createPaymentIntent);

/**
 * @swagger
 * /api/payment/webhook:
 *   post:
 *     summary: Stripe webhook endpoint for payment events
 *     description: |
 *       Receives and processes webhook events from Stripe when payment-related events occur. This endpoint is called directly by Stripe's servers, not by your frontend.
 *
 *       **Security:**
 *       - Verifies webhook signature using Stripe webhook secret
 *       - Prevents fake payment success calls from malicious actors
 *       - Only processes events with valid Stripe signatures
 *       - Signature is automatically added by Stripe in the `stripe-signature` header
 *
 *       **Handled Events:**
 *       - `payment_intent.succeeded` - When a payment is successfully processed
 *
 *       **Actions Performed on Payment Success:**
 *       1. Verifies the webhook signature for authenticity
 *       2. Extracts order ID from payment intent metadata
 *       3. Finds the order in the database with user details
 *       4. Marks order as paid with timestamp
 *       5. Stores payment result details (payment ID, status, email)
 *       6. Sends payment confirmation email to customer
 *
 *       **Email Notification:**
 *       - Subject: "Payment Confirmed - Testimony's Store"
 *       - Recipient: Customer's email address
 *       - Content: Username, order ID, payment amount, and confirmation message
 *
 *       **Important Notes:**
 *       - This endpoint expects raw request body (not JSON parsed)
 *       - Must be configured in Stripe Dashboard as webhook endpoint
 *       - Webhook secret must be set in `STRIPE_WEBHOOK_SECRET` environment variable
 *       - Email failure does not affect webhook processing (logged only)
 *       - Always returns 200 to acknowledge receipt to Stripe
 *
 *       ** This endpoint cannot be tested in Swagger UI** - It must be called by Stripe's servers with proper signatures.
 *
 *       **Local Testing:**
 *       ```bash
 *       # Install Stripe CLI
 *       brew install stripe/stripe-cli/stripe  # macOS
 *
 *       # Login to Stripe
 *       stripe login
 *
 *       # Forward webhooks to your local server
 *       stripe listen --forward-to localhost:3000/api/payment/webhook
 *
 *       # Trigger a test payment event
 *       stripe trigger payment_intent.succeeded
 *       ```
 *
 *       **Production Setup:**
 *       1. Go to Stripe Dashboard: https://dashboard.stripe.com/webhooks
 *       2. Click "Add endpoint"
 *       3. Enter your production URL: https://yourdomain.com/api/payment/webhook
 *       4. Select event: `payment_intent.succeeded`
 *       5. Copy the webhook signing secret to your environment variables
 *     tags: [Payment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Stripe webhook event object (automatically sent by Stripe, not manually constructed)
 *             properties:
 *               id:
 *                 type: string
 *                 description: Unique event identifier
 *                 example: "evt_1ABC123XYZ456"
 *               type:
 *                 type: string
 *                 description: Event type
 *                 example: "payment_intent.succeeded"
 *               data:
 *                 type: object
 *                 properties:
 *                   object:
 *                     type: object
 *                     description: The payment intent object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Payment intent ID
 *                         example: "pi_3ABC123def456"
 *                       amount:
 *                         type: integer
 *                         description: Amount in cents (smallest currency unit)
 *                         example: 219780
 *                       status:
 *                         type: string
 *                         description: Payment status
 *                         example: "succeeded"
 *                       metadata:
 *                         type: object
 *                         description: Custom metadata attached during payment intent creation
 *                         properties:
 *                           orderId:
 *                             type: string
 *                             description: Order ID stored for webhook processing
 *                             example: "507f1f77bcf86cd799439011"
 *                       receipt_email:
 *                         type: string
 *                         description: Customer email for receipt
 *                         example: "customer@gmail.com"
 *           examples:
 *             paymentSuccess:
 *               summary: Payment succeeded event
 *               value:
 *                 id: "evt_1ABC123XYZ456"
 *                 type: "payment_intent.succeeded"
 *                 data:
 *                   object:
 *                     id: "pi_3ABC123def456"
 *                     amount: 219780
 *                     status: "succeeded"
 *                     metadata:
 *                       orderId: "507f1f77bcf86cd799439011"
 *                     receipt_email: "customer@gmail.com"
 *     parameters:
 *       - in: header
 *         name: stripe-signature
 *         required: true
 *         schema:
 *           type: string
 *         description: Stripe webhook signature for verification (automatically added by Stripe)
 *         example: "t=1614556800,v1=abc123def456ghi789jkl012mno345pqr678stu901vwx234yz"
 *     responses:
 *       200:
 *         description: Webhook received and processed successfully
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: ""
 *             examples:
 *               success:
 *                 summary: Webhook processed successfully
 *                 value: ""
 *       400:
 *         description: Invalid webhook signature or malformed request
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *             examples:
 *               invalidSignature:
 *                 summary: Invalid signature
 *                 value: "Webhook Error: No signatures found matching the expected signature"
 *               invalidPayload:
 *                 summary: Invalid JSON payload
 *                 value: "Webhook Error: Unexpected end of JSON input"
 *               missingSignature:
 *                 summary: Missing signature header
 *                 value: "Webhook Error: No stripe-signature header found"
 */
// Webhook: MUST use express.raw()
// This route is technically "public" but secured by the Stripe Signature
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

export default router;
