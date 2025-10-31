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
  //"https://pay.chargily.com/payment-links/01k8ts5v092rztj10vhwkwm226";//

// 🔹 Checkout route — redirects directly to Chargily link
app.get("/checkout", (req, res) => {
  res.redirect(CHARGILY_PAYMENT_LINK);
});

// 🔹 Basic test route
app.get("/", (req, res) => {
  res.send("Chargily redirect API is live ✅");
});

// 🔹 Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server live on port ${PORT}`));
