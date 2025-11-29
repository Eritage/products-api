import express from "express";
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller.js";
import { protect } from "../middlewares/auth.middleware.js"; // The Guard

const router = express.Router();

// Route: /api/products
router
  .route("/")
  .get(getProducts) // Public: Anyone can see the list
  .post(protect, createProduct); // Protected: Only logged-in users can create

// Route: /api/products/:id
router
  .route("/:id")
  .get(getProductById) // Public: Anyone can see details
  .put(protect, updateProduct) // Protected: Update
  .delete(protect, deleteProduct); // Protected: Delete

export default router;
