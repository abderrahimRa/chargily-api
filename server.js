import express from "express";
import cors from "cors";

const app = express();
app.use(cors());

// ✅ Static Chargily payment link (already created in Chargily dashboard)
const CHARGILY_PAYMENT_LINK =
  "http://pay.chargily.com/payment-links/01k8ts5v092rztj10vhwkwm226";

// ✅ Pages
const THANK_YOU_PAGE = "https://www.kobouchacademy.com/943d7675";
const FAILURE_PAGE = "https://www.kobouchacademy.com/93e8de5d";

// 🔹 Checkout route — redirect directly to Chargily payment page
app.get("/checkout", (req, res) => {
  res.redirect(CHARGILY_PAYMENT_LINK);
});

// 🔹 Simulation routes for testing redirects
app.get("/simulate-success", (req, res) => res.redirect(THANK_YOU_PAGE));
app.get("/simulate-failed", (req, res) => res.redirect(FAILURE_PAGE));

// 🔹 Test route
app.get("/", (req, res) => res.send("Chargily redirect API is running ✅"));

// 🔹 Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server live on port ${PORT}`));
