import mongoose from "mongoose";

// Define what a single Review looks like
const reviewSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    rating: { type: Number, required: true },
    comment: { type: String, required: true },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User", // Links the review to a user
    },
  },
  {
    timestamps: true,
  }
);

const productSchema = new mongoose.Schema(
  {
    // This links the product to a specific User
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    name: {
      type: String,
      required: [true, "Please add a name"],
      trim: true,
    },
    image: {
      type: String,
      required: true,
      default:
        "[https://via.placeholder.com/150](https://via.placeholder.com/150)", // Fallback image
    },
    price: {
      type: Number,
      required: [true, "Please add a price"],
      default: 0,
    },
    description: {
      type: String,
      required: [true, "Please add a description"],
    },
    category: {
      type: String,
      required: [true, "Please add a category"],
    },
    countInStock: {
      type: Number,
      required: true,
      default: 0,
    },
    reviews: [reviewSchema], // An array of the reviews defined above

    rating: {
      type: Number,
      required: true,
      default: 0, // The average rating (e.g., 4.5)
    },

    numReviews: {
      type: Number,
      required: true,
      default: 0, // How many people reviewed it
    },
  },
  {
    timestamps: true,
  }
);

// This allows MongoDB to search 'name' and 'description' efficiently
// without scanning the entire collection (RegEx scan).
productSchema.index({ name: "text", description: "text" });
export default mongoose.model("Product", productSchema);
