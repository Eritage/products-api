import jwt from "jsonwebtoken";

const generateToken = (id) => {
  // We use the ID as the payload so we know who the token belongs to
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "3h", // Token expires in 1 hour
  });
};

export default generateToken;
