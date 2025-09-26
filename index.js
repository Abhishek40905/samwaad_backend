import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import Razorpay from "razorpay";
import crypto from "crypto";
import dotenv from "dotenv";
import connectDB from "./connect_db.js";
import { Order } from "./order.model.js";
import nodemailer from "nodemailer";


dotenv.config();



async function sendBookingConfirmationEmail(order) {
  // Create a transporter
  const transporter = nodemailer.createTransport({
    service:"gmail", // e.g., smtp.gmail.com
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER, // your email
      pass: process.env.SMTP_PASS, // your email password or app password
    },
  });

  // Email content
  const mailOptions = {
    from: `"Samwaad Conference" <${process.env.SMTP_USER}>`,
    to: order.email, // recipient email from order
    subject: "Booking Confirmation - Samwaad",
    html: `
      <h2>Hi ${order.fullName},</h2>
      <p>Thank you for booking your spot at <strong>Samwaad Conference</strong>!</p>
      <h3>Booking Details:</h3>
      <ul>
        <li><strong>Order ID:</strong> ${order.razorpay_order_id}</li>
        <li><strong>Payment ID:</strong> ${order.razorpay_payment_id}</li>
        <li><strong>Ticket Type:</strong> ${order.ticketType}</li>
        <li><strong>Number of Tickets:</strong> ${order.tickets}</li>
        <li><strong>Preferred Date:</strong> ${order.preferredDate}</li>
        <li><strong>Total Amount:</strong> ₹${order.amount}</li>
      </ul>
      <p>We look forward to seeing you at the event!</p>
      <p>Abhishek</p>
      <p>Team samwaad</p>
    `,
  };

  // Send the email
  try {
    await transporter.sendMail(mailOptions);
    console.log("Booking confirmation email sent to:", order.email);
  } catch (error) {
    console.error("Error sending booking email:", error);
  }
}


const app = express();
app.use(cors());
app.use(bodyParser.json());


const razorpay = new Razorpay({
  key_id: process.env.RAZOR_PAY_KEY_ID,
  key_secret: process.env.RAZOR_PAY_SECRET,
});

app.post("/create-order", async (req, res) => {
  try {
    const { amount, fullName, email, phone, tickets, ticketType, preferredDate } = req.body;

    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    };

    const order = await razorpay.orders.create(options);

    // Save to DB
    const dbOrder = await Order.create({
      fullName,
      email,
      phone,
      tickets,
      ticketType,
      preferredDate,
      razorpay_order_id: order.id,
      amount
    });
    dbOrder.save();
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create order" });
  }
});

app.post("/verify-payment", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZOR_PAY_SECRET)
      .update(sign)
      .digest("hex");

    const order = await Order.findOne({ razorpay_order_id });

    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    if (razorpay_signature === expectedSign) {
      order.razorpay_payment_id = razorpay_payment_id;
      order.razorpay_signature = razorpay_signature;
      order.status = "paid";
      await order.save();
      sendBookingConfirmationEmail(order);

      res.json({ success: true, message: "Payment verified and saved!" });
    } else {
      order.status = "failed";
      await order.save();
      res.status(400).json({ success: false, message: "Payment verification failed" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error verifying payment" });
  }
});


// ------------------- START SERVER -------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    connectDB()
    console.log(`Server running on http://localhost:${PORT}`);
});
