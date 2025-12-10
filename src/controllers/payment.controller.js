import Stripe from "stripe";
import dotenv from "dotenv";
import Order from "../models/order.model.js";
import sendEmail from "../utils/sendEmail.js";

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * description: Create Payment Intent
 * route: POST /api/payment/create-payment-intent
 * access: Private
 */
export const createPaymentIntent = async (req, res) => {
  try {
    // SECURE: We only accept the orderId. We ignore any 'amount' sent by the user.
    const { orderId, currency } = req.body;

    if (!orderId) {
      return res.status(400).json({ status: false, message: "Order ID is required" });
    }

    // Fetch the REAL order from the database
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ status: false, message: "Order not found" });
    }

    // Security Check: Ensure the user paying owns the order
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ status: false, message: "Not authorized to pay for this order" });
    }

    // Calculate price using DATABASE value (Secure)
    const amountToCharge = Math.round(order.totalPrice * 100); // Stripe expects cents

    // Create the Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountToCharge,
      currency: currency || "usd",
      metadata: {
        orderId: orderId // <--- CRITICAL: This tags the payment so the webhook can find it later
      },
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never" // Prevents the "return_url" error during testing
      },
    });

    res.status(200).json({
      status: true,
      clientSecret: paymentIntent.client_secret,
      amount: order.totalPrice
    });
  } catch (error) {
    console.error("Stripe Error:", error);
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

/**
 * description: Stripe Webhook (Step 2: Stripe tells us payment worked)
 * route: POST /api/payment/webhook
 * access: Public (Secured by Stripe Signature)
 */
export const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    // Verify the call is actually from Stripe using your Webhook Secret
    // This prevents hackers from faking a payment success call
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the specific event "payment_intent.succeeded"
  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;

    // Retrieve the Order ID we hid in the metadata earlier
    const orderId = paymentIntent.metadata.orderId;

    if (orderId) {
      try {
        // Find the order in the database
        const order = await Order.findById(orderId).populate(
          "user",
          "email username"
        );

        if (order) {
          // MARK IT AS PAID
          order.isPaid = true;
          order.paidAt = Date.now();
          order.paymentResult = {
            id: paymentIntent.id,
            status: paymentIntent.status,
            update_time: new Date().toISOString(),
            email_address: paymentIntent.receipt_email || order.user.email,
          };

          await order.save();
          console.log(`SUCCESS: Order ${orderId} marked as paid.`);

          // Send the "Payment Received" Email
          try {
            await sendEmail({
              email: order.user.email,
              subject: "Payment Confirmed - Testimony's Store",
              message: `We received your payment for Order ${order._id}. We are processing it now.`,
              html: `
                          <h3>Payment Confirmed</h3>
                          <p>Hi ${order.user.username},</p>
                          <p>We received your payment for order <strong>${order._id}</strong>.</p>
                          <p>Total Paid: $${(paymentIntent.amount / 100).toFixed(2)}</p>
                        `,
            });
          } catch (emailErr) {
            console.error("Webhook Email Failed:", emailErr.message);
          }
        } else {
          console.error(`Order ${orderId} not found in DB.`);
        }
      } catch (dbError) {
        console.error("Error updating order in webhook:", dbError.message);
      }
    }
  }

  // Return 200 to Stripe so they know we heard them.
  res.send();
};

/**
 * description: Send Stripe Public Key
 * route: GET /api/payment/config
 * access: Public
 */
export const getStripeConfig = (req, res) => {
  res.status(200).json({
    status: true,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  });
};
