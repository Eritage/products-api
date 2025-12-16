import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import sendEmail from "../utils/sendEmail.js";

// description: Create new order
// route: POST /api/orders
// access: Private/Needs Token
export const addOrderItems = async (req, res) => {
  try {
    const { orderItems, shippingAddress, paymentMethod } = req.body;

    // Validate cart not empty
    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({
        status: false,
        message: "No order items",
        data: null,
      });
    }

    // --- PERFORMANCE FIX: N+1 QUERY PROBLEM ---
    // Instead of looping and querying for EACH item (10 items = 10 DB calls),
    // we fetch ALL products in ONE database call.

    // 1. Get all Product IDs from the request
    const productIds = orderItems.map((item) => item.product);

    // 2. Fetch all these products from DB in one go
    const dbProducts = await Product.find({ _id: { $in: productIds } });

    // 3. Create a map for easy lookup (ID -> Product Object)
    const productMap = {};
    dbProducts.forEach((p) => {
      productMap[p._id.toString()] = p;
    });

    let itemsPrice = 0;
    const validatedOrderItems = [];
    const bulkOption = []; // For bulk stock updates

    // 4. Process items using the map (In-Memory, super fast)
    for (const item of orderItems) {
      const product = productMap[item.product];

      if (!product) {
        return res.status(404).json({
          status: false,
          message: `Product ${item.product} not found`,
          data: null,
        });
      }

      if (product.countInStock < item.quantity) {
        return res.status(400).json({
          status: false,
          message: `${product.name} is out of stock`,
          data: null,
        });
      }

      const itemTotal = product.price * item.quantity;
      itemsPrice += itemTotal;

      validatedOrderItems.push({
        product: product._id,
        name: product.name,
        quantity: item.quantity,
        price: product.price,
        image: product.image,
      });

      // Prepare bulk update operation for later
      bulkOption.push({
        updateOne: {
          filter: { _id: product._id },
          update: { $inc: { countInStock: -item.quantity } },
        },
      });
    }

    const taxPrice = Number((itemsPrice * 0.1).toFixed(2));
    const shippingPrice = itemsPrice > 100 ? 0 : 10;
    const totalPrice = itemsPrice + taxPrice + shippingPrice;

    const order = new Order({
      orderItems: validatedOrderItems,
      user: req.user._id,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
    });

    // 5. Execute all stock updates in ONE database call
    if (bulkOption.length > 0) {
      await Product.bulkWrite(bulkOption);
    }

    const createdOrder = await order.save();

    // --- SEND EMAIL NOTIFICATION ---
    try {
      await sendEmail({
        email: req.user.email,
        subject: "Order Confirmation - Products API",
        message: `Thank you for your order! \n\nOrder ID: ${createdOrder._id}\nTotal Price: $${totalPrice}\n\nWe will notify you when it ships.`,
        html: `
          <h1>Thank you for your order!</h1>
          <p>Order ID: <strong>${createdOrder._id}</strong></p>
          <p>Total Price: <strong>$${totalPrice}</strong></p>
          <p>We will notify you when it ships.</p>
        `,
      });
    } catch (emailError) {
      console.error("Email could not be sent:", emailError.message);
    }

    res.status(201).json({
      status: true,
      message: "Order created successfully",
      data: createdOrder,
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};


// description: Get logged in user orders
// route: GET /api/orders/myOrders
// access: Private/Needs Token
export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id });
    res.json({
      status: true,
      message: "Users order fetched successfully",
      data: orders,
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

// description: Get Order by ID
// route: GET /api/orders/:id
// access: Private/Needs Token
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      "user",
      "username email"
    );

    if (order) {
      // SECURITY CHECK: User must own the order OR be admin
      if (
        order.user._id.toString() === req.user._id.toString() ||
        req.user.isAdmin
      ) {
        res.json({
          status: true,
          message: "Order fetched successfully",
          data: order,
        });
      } else {
        // User trying to access someone else's order
        return res.status(403).json({
          status: false,
          message: "Not authorized to view this order",
          data: null,
        });
      }
    } else {
      res.status(404).json({
        status: false,
        message: "Order not found",
        data: null,
      });
    }
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

// description: Get all orders
// route: GET /api/orders
// access: Private/Needs Token/Admin
export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find({}).populate("user", "id username");
    res.json({
      status: true,
      message: "All orders fetched successfully",
      data: orders,
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

// description: Update order to delivered
// route: PUT /api/orders/:id/deliver
// access: Private/Needs Token/Admin
export const updateOrderToDelivered = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (order) {
      order.isDelivered = true;
      order.deliveredAt = Date.now();

      const updatedOrder = await order.save();
      // SEND EMAIL NOTIFICATION
      try {
        await sendEmail({
          email: req.user.email,
          subject: "Your Order has arrived",
          message: `Notification that the package is at their location. \n\nOrder ID: ${updatedOrder._id} \n\nYour order is now available.`,
          html: `
          <h1>Thank you for your order!</h1>
          <p>Order ID: <strong>${updatedOrder._id}</strong></p>
          <p>Your Order has arrived.</p>
        `,
        });
      } catch (emailError) {
        console.error("Email could not be sent:", emailError.message);
        // We don't fail the request if email fails, just log it
      }

      res.json({
        status: true,
        message: "Order delivered successfully",
        data: updatedOrder,
      });
    } else {
      res.status(404).json({
        status: false,
        message: "Order not found",
        data: null,
      });
    }
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};
