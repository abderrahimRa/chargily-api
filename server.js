import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import fetch from "node-fetch"; // Using fetch instead of axios

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// ✅ Chargily API live endpoint for payment-links
const CHARGILY_API_URL = "https://pay.chargily.com/api/v2/payment-links";
const CHARGILY_SECRET_KEY = process.env.CHARGILY_SECRET_KEY;

// ✅ Pages
const THANK_YOU_PAGE = "https://www.kobouchacademy.com/943d7675";
const FAILURE_PAGE = "https://www.kobouchacademy.com/93e8de5d";

// 🔹 Checkout route — dynamically creates a live payment link
app.get("/checkout", async (req, res) => {
  try {
    const response = await fetch(CHARGILY_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CHARGILY_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: 4900,
        currency: "dzd",
        description: "Digital Course Purchase - Kobouch Academy",
        success_url: THANK_YOU_PAGE,
        failure_url: FAILURE_PAGE,
        metadata: { product: "course1" },
      }),
    });

    const data = await response.json();

    if (data.checkout_url) {
      // Redirect user to live checkout page
      res.redirect(data.checkout_url);
    } else {
      res
        .status(500)
        .json({ message: "Failed to generate payment link", data });
    }
  } catch (err) {
    console.error("Error creating live payment link:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 🔹 Optional routes
app.get("/thank-you", (req, res) => res.redirect(THANK_YOU_PAGE));
app.get("/failed", (req, res) => res.redirect(FAILURE_PAGE));
app.get("/", (req, res) => res.send("Chargily live payment API is running ✅"));

// 🔹 Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server live on port ${PORT}`));
