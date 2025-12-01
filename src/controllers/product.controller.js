import cloudinary from "../config/cloudinary.js";
import Product from "../models/product.model.js";

// description: Fetch all products with Search & Pagination
// route: GET /api/products?keyword=iphone&page=2
// access: Public
export const getProducts = async (req, res) => {
  try {
    // SEARCH LOGIC (The Regex part)
    const keyword = req.query.keyword
      ? { name: { $regex: req.query.keyword, $options: "i" } }
      : {};

    // PAGINATION LOGIC (The Math part)
    const pageSize = 4;
    const page = Number(req.query.page) || 1;

    // 3. DB QUERY
    const count = await Product.countDocuments({ ...keyword }); // Count total matches

    const products = await Product.find({ ...keyword }) // Find matches
      .limit(pageSize) // Take 4
      .skip(pageSize * (page - 1)); // Skip previous pages

    // 4. RESPONSE
    res.json({
      status: true,
      count: products.length,
      message: "Products fetched successfully",
      data: products,
      pagination: {
        page,
        pages: Math.ceil(count / pageSize),
        total: count,
      },
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

    // 1. Check if a file was uploaded
    let imageUrl =
      "[https://via.placeholder.com/150](https://via.placeholder.com/150)"; // Default

    if (req.file) {
      // 2. Upload to Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path);
      imageUrl = result.secure_url; // This is the link we save!
    }

    // 3. Create Product with the URL
    const product = new Product({
      user: req.user._id,
      name,
      price,
      description,
      category,
      countInStock,
      image: imageUrl, // <--- SAVE THE LINK
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
      // SECURITY CHECK:
      // Convert IDs to strings to compare them (MongoDB ObjectIds are objects)
      // Allow if user is owner OR if user is admin
      if (
        product.user.toString() !== req.user._id.toString() &&
        !req.user.isAdmin
      ) {
        return res
          .status(401)
          .json({ message: "Not authorized to edit this product" });
      }
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
