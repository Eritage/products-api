import Order from "../models/order.model.js";
import Product from "../models/product.model.js";

// description: Create new order
// route: POST /api/orders
// access: Private/Needs Token
export const addOrderItems = async (req, res) => {
  try {
    const { orderItems, shippingAddress, paymentMethod } = req.body;

    // 1. Validate cart not empty
    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({
        status: false,
        message: "No order items",
        data: null,
      });
    }

    // 2. CALCULATE PRICES ON BACKEND (Security!)
    let itemsPrice = 0;
    const validatedOrderItems = [];

    for (const item of orderItems) {
      // Get actual product from database
      const product = await Product.findById(item.product);

      if (!product) {
        return res.status(404).json({
          status: false,
          message: `Product ${item.product} not found`,
          data: null,
        });
      }

      // Check stock availability
      if (product.countInStock < item.quantity) {
        return res.status(400).json({
          status: false,
          message: `${product.name} is out of stock`,
          data: null,
        });
      }

      // Use ACTUAL price from database (not from user)
      const itemTotal = product.price * item.quantity;
      itemsPrice += itemTotal;

      validatedOrderItems.push({
        product: product._id,
        name: product.name,
        quantity: item.quantity,
        price: product.price,  // ← From database, not user input
        image: product.image,
      });
    }

    // 3. Calculate other prices
    const taxPrice = Number((itemsPrice * 0.1).toFixed(2));  // 10% tax
    const shippingPrice = itemsPrice > 100 ? 0 : 10;          // Free shipping over $100
    const totalPrice = itemsPrice + taxPrice + shippingPrice;

    // 4. Create the Order with calculated prices
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

    // 5. Update product stock
    for (const item of validatedOrderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { countInStock: -item.quantity },
      });
    }

    // 6. Save order
    const createdOrder = await order.save();

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

// description: Update order to paid
// route: PUT /api/orders/:id/pay
// access: Private/Needs Token
export const updateOrderToPaid = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (order) {
      order.isPaid = true;
      order.paidAt = Date.now();
      // Normally, this comes from PayPal/Stripe response. We simulate it here.
      order.paymentResult = {
        id: req.body.id || "SIMULATED_PAYMENT_ID",
        status: req.body.status || "COMPLETED",
        update_time: req.body.update_time || Date.now(),
        email_address: req.body.email_address || req.user.email,
      };

      const updatedOrder = await order.save();
      res.json({
        status: true,
        message: "Order paid successfully",
        data: updatedOrder,
      });
    } else {
      res.status(404).json({ status:false, message: "Order not found", data: null });
    }
  } catch (error) {
    res.status(500).json({ status:false, message: error.message });
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
    res.status(500).json({ status:false, message: error.message });
  }
};
