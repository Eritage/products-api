import mongoose from "mongoose";
import bcrypt from "bcrypt";
import validator from "validator";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Please add a username"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Please add an email"],
      unique: true,
      lowercase: true,
      // Uses the professional validator package
      validate: [validator.isEmail, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Please add a password"],
      minlength: 6,
      select: false, // Security: Hides password from normal queries
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true, // Allows null/undefined values for users who didn't use Google
    },
    // This determines if a user is a "Manager" or "Customer"
    isAdmin: {
      type: Boolean,
      required: true,
      default: false, // Default is regular user
    },
  },
  { timestamps: true }
);

// SECURITY 1: Encrypt password automatically before saving
userSchema.pre("save", async function () {
  // If password is not modified, skip hashing
  if (!this.isModified("password")) {
    return;
  }

  // Hash the password
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// SECURITY 2: Helper to compare passwords for Login
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("User", userSchema);
