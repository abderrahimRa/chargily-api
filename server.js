import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

// Chargily API base
const BASE_URL = "https://pay.chargily.com/api/v2/payments";

// Single course route
app.get("/checkout", async (req, res) => {
  try {
    const response = await axios.post(
      BASE_URL,
      {
        amount: 4900, // price in DZD
        currency: "DZD",
        success_url: "https://www.kobouchacademy.com/943d7675", // thank-you page
        //failure_url: "https://www.kobouchacademy.com/payment-failed", // not yet created, but you can edit later
        description: "Digital Course Purchase - Kobouch Academy",
        metadata: { product: "course1" },
      },
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.CHARGILY_SECRET_KEY}`,
        },
      }
    );

    const payment = response.data;

    // Redirect buyer to Chargily checkout page
    if (payment.checkout_url) {
      res.redirect(payment.checkout_url);
    } else {
      res
        .status(500)
        .json({ message: "Payment link not returned by Chargily." });
    }
  } catch (error) {
    console.error(
      "Error creating payment:",
      error.response?.data || error.message
    );
    res.status(500).json({ message: "Failed to create payment." });
  }
});

// Basic route for testing
app.get("/", (req, res) => {
  res.send("Chargily payment API is running ✅");
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server live on port ${PORT}`));
