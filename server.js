import express from "express";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

// ✅ Your existing Chargily static payment link
const CHARGILY_PAYMENT_LINK =
  "http://pay.chargily.com/test/payment-links/01k8x9dyrp67pkm5kt3gb7xry4";

// ✅ Thank-you and failure pages
const THANK_YOU_PAGE = "https://www.kobouchacademy.com/943d7675";
const FAILURE_PAGE = "https://www.kobouchacademy.com/93e8de5d";

// 🔹 Checkout route — redirects directly to Chargily link
app.get("/checkout", (req, res) => {
  res.redirect(CHARGILY_PAYMENT_LINK);
});

// 🔹 Thank-you page route
app.get("/thank-you", (req, res) => {
  res.redirect(THANK_YOU_PAGE);
});

// 🔹 Failure page route
app.get("/failed", (req, res) => {
  res.redirect(FAILURE_PAGE);
});

// 🔹 Basic test route
app.get("/", (req, res) => {
  res.send("Chargily redirect API is live ✅");
});

// 🔹 Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server live on port ${PORT}`));
