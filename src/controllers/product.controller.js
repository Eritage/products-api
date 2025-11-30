import Product from "../models/product.model.js";

// description: Fetch all products
// route: GET /api/products
// access: Public
export const getProducts = async (req, res) => {
  try {
    const products = await Product.find({});
    res.json({
      status: true, // Status indicator
      count: products.length, // Helpful metadata
      message: "Products fetched successfully",
      data: products, // The actual array of data
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

// description: Fetch single product
// route: GET /api/products/:id
// access: Public
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      res.json({
        status: true, // Status indicator
        count: product.length, // Helpful metadata
        message: "Products fetched successfully",
        data: product, // The actual array of data
      });
    } else {
      res.status(404).json({
        status: false,
        message: "Product not found",
        data: null,
      });
    }
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

// description: Create a product
// route: POST /api/products
// access: Private (Needs Token)
export const createProduct = async (req, res) => {
  try {
    const { name, price, description, category, countInStock } = req.body;

    // We get 'req.user._id' from the Auth Middleware (which we will connect next)
    const product = new Product({
      user: req.user._id,
      name,
      price,
      description,
      category,
      countInStock,
    });

    const createdProduct = await product.save();

    if (createdProduct) {
      res.status(201).json({
        status: true, // Status indicator
        count: createdProduct.length, // Helpful metadata
        message: "Products created successfully",
        data: createdProduct, // The actual array of data
      });
    } else {
      res.status(400).json({
        status: false,
        message: "Invalid product data",
        data: null,
      });
    }
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

// description: Delete a product
// route: DELETE /api/products/:id
// access: Private (Needs Token)
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      await product.deleteOne();
      res.status(200).json({
        status: true,
        count: product.length,
        message: "Product deleted successfully",
        data: product,
      });
    } else {
      res.status(404).json({
        status: true,
        message: "Product not found",
        data: null,
      });
    }
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

// description: Update a product
// route: PUT /api/products/:id
// access: Private (Needs Token)
export const updateProduct = async (req, res) => {
  try {
    const { name, price, description, category, countInStock } = req.body;

    const product = await Product.findById(req.params.id);

    if (product) {
      product.name = name || product.name;
      product.price = price || product.price;
      product.description = description || product.description;
      product.category = category || product.category;
      product.countInStock = countInStock || product.countInStock;

      const updatedProduct = await product.save();
      res.status(200).json({
        status: true,
        count: updatedProduct.length,
        message: "Product updated successfully",
        data: updatedProduct,
      });
    } else {
      res.status(404).json({
        status: false,
        message: "Product not found",
        data: null,
      });
    }
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};
