import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// ✅ Chargily live API endpoint
const CHARGILY_API_URL = "https://pay.chargily.com/api/v2/payment-links";
const CHARGILY_SECRET_KEY = process.env.CHARGILY_SECRET_KEY;

// ✅ Pages
const THANK_YOU_PAGE = "https://www.kobouchacademy.com/943d7675";
const FAILURE_PAGE = "https://www.kobouchacademy.com/93e8de5d";

// 🔹 Checkout route — dynamically creates a live payment link
app.get("/checkout", async (req, res) => {
  try {
    const response = await axios.post(
      "https://pay.chargily.com/api/v2/payment-links",
      {
        name: "Digital Course Purchase - Kobouch Academy", // required
        items: [
          {
            name: "Course 1",
            price: 4900,
            currency: "DZD",
            quantity: 1,
          },
        ],
        success_url: "https://www.kobouchacademy.com/943d7675",
        failure_url: "https://www.kobouchacademy.com/93e8de5d",
        metadata: { product: "course1" },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.CHARGILY_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = response.data;

    if (data.checkout_url) {
      res.redirect(data.checkout_url);
    } else {
      res
        .status(500)
        .json({ message: "Failed to generate payment link", data });
    }
  } catch (err) {
    console.error("Checkout error:", err.response?.data || err.message);
    res.status(500).json({ message: "Server error" });
  }
});
app.post("/webhook", (req, res) => {
  const event = req.body;

  // Log for debugging
  console.log("Webhook received:", event);

  // Check if payment was successful
  if (event.status === "PAID") {
    const product = event.metadata?.product;
    const customerEmail = event.client?.email;

    // TODO: Unlock course, send email, save to database
    console.log(`Grant access to ${product} for ${customerEmail}`);
  }

  // Respond quickly to Chargily to confirm receipt
  res.status(200).send({ received: true });
});

// 🔹 Optional routes for testing
app.get("/simulate-success", (req, res) => res.redirect(THANK_YOU_PAGE));
app.get("/simulate-failed", (req, res) => res.redirect(FAILURE_PAGE));

// 🔹 Test route
app.get("/", (req, res) => res.send("Chargily live payment API is running ✅"));

// 🔹 Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server live on port ${PORT}`));
