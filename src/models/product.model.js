import mongoose from "mongoose";

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
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Product", productSchema);
