import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  fullName: String,
  email: String,
  phone: String,
  tickets: Number,
  ticketType: String,
  preferredDate: String,
  razorpay_order_id: String,
  razorpay_payment_id: String,
  razorpay_signature: String,
  amount: Number,
  status: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
  createdAt: { type: Date, default: Date.now }
});

export const Order = mongoose.model("Order", orderSchema);
