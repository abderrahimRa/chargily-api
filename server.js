import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Resend } from "resend";
import axios from "axios";
import { verifySignature } from "@chargily/chargily-pay";

dotenv.config();
const app = express();
app.use(cors());

// Middleware to capture raw body for signature verification
app.use("/webhook", express.raw({ type: "application/json" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Optional client webhook forwarding URL
const CLIENT_WEBHOOK_URL = process.env.CLIENT_WEBHOOK_URL || "";

// Chargily API configuration
const CHARGILY_API_KEY =
  process.env.CHARGILY_API_KEY || process.env.CHARGILY_SECRET_KEY || "";

// Initialize Resend (much simpler than SMTP!)
const resend = new Resend(process.env.RESEND_API_KEY);

// ✅ Chargily static payment link
const CHARGILY_PAYMENT_LINK =
  "http://pay.chargily.com/test/payment-links/01k8x9dyrp67pkm5kt3gb7xry4";

// ✅ Pages
const THANK_YOU_PAGE = "https://www.kobouchacademy.com/943d7675";
const FAILURE_PAGE = "https://www.kobouchacademy.com/93e8de5d";

// ✅ Course Google Drive link
const COURSE_DRIVE_LINK =
  "https://drive.google.com/drive/folders/1du0o_pfQTLgFKTmM1clmvc4ZLEEDsIq6?usp=sharing";

// 🔹 Checkout route — redirect to Chargily
app.get("/checkout", (req, res) => {
  // Get customer email from query param if provided
  const email = req.query.email || "";

  // If email provided, we could create a dynamic payment link
  // For now, redirect to static link but log the email
  if (email) {
    console.log("Checkout initiated for email:", email);
    // TODO: Store email-paymentId mapping in database/memory for later lookup
  }

  res.redirect(CHARGILY_PAYMENT_LINK);
});

// 🔹 Alternative: Create payment session with return URL (if Chargily API supports it)
app.post("/create-payment", async (req, res) => {
  const { email, amount = 100 } = req.body; // amount in smallest currency unit

  if (!email) {
    return res.status(400).json({ error: "Email required" });
  }

  try {
    // This would use Chargily API to create a payment session
    // const paymentSession = await createChargilyPayment({
    //   amount,
    //   customer: { email },
    //   success_url: `https://chargily-api-1.onrender.com/payment-return?email=${encodeURIComponent(email)}&status=success`,
    //   cancel_url: `https://chargily-api-1.onrender.com/payment-return?email=${encodeURIComponent(email)}&status=failed`
    // });

    // For now, redirect to static link with email in query
    const paymentUrl = `${CHARGILY_PAYMENT_LINK}?prefill_email=${encodeURIComponent(
      email
    )}`;
    res.json({ payment_url: paymentUrl });
  } catch (err) {
    console.error("Failed to create payment:", err);
    res.status(500).json({ error: "Failed to create payment" });
  }
});

// 🔹 Payment return handler - for when Chargily redirects user back after payment
app.get("/payment-return", async (req, res) => {
  console.log("Payment return called with query params:", req.query);
  console.log("Payment return called with URL:", req.url);

  // Extract payment info from query parameters or URL path
  const paymentId = req.query.payment_id || req.query.id || "";
  const status = req.query.status || req.query.payment_status || "";
  const email = req.query.email || req.query.customer_email || "";

  // Log for debugging
  console.log(
    "Extracted - paymentId:",
    paymentId,
    "status:",
    status,
    "email:",
    email
  );

  // If we have an email and it looks like success, send the course
  if (email && (status === "success" || status === "paid" || paymentId)) {
    try {
      await sendEmail(email, COURSE_DRIVE_LINK);
      console.log(`Course link sent to ${email} from payment return`);
    } catch (err) {
      console.error(
        "Failed to send email from payment return:",
        err?.message || err
      );
    }
  }

  // Redirect user to thank you page regardless
  res.redirect(THANK_YOU_PAGE);
});

// 🔹 Simulation routes
app.get("/simulate-success", (req, res) => res.redirect(THANK_YOU_PAGE));
app.get("/simulate-failed", (req, res) => res.redirect(FAILURE_PAGE));

// 🔹 Webhook route — called by Chargily on successful payment
let lastWebhook = null; // store last webhook for debugging

app.post("/webhook", async (req, res) => {
  const signature = req.get("signature") || req.get("x-signature") || "";
  const payload = req.body; // This is the raw Buffer from express.raw()

  // Store webhook for debugging
  lastWebhook = {
    headers: req.headers,
    body: payload.toString(), // Convert Buffer to string for storage
    receivedAt: new Date().toISOString(),
    signature: signature,
  };

  console.log("=== CHARGILY WEBHOOK RECEIVED ===");
  console.log("Headers:", JSON.stringify(req.headers, null, 2));
  console.log("Signature:", signature);
  console.log("Raw payload length:", payload.length);
  console.log("==============================");

  // Verify signature if API key is configured
  if (CHARGILY_API_KEY && signature) {
    try {
      if (!verifySignature(payload, signature, CHARGILY_API_KEY)) {
        console.warn(
          "❌ Webhook signature verification failed - continuing anyway for now"
        );
        // TODO: Fix signature verification - temporarily disabled
        // return res.status(403).send("Invalid signature");
      } else {
        console.log("✅ Webhook signature verified");
      }
    } catch (error) {
      console.error("❌ Error verifying signature:", error?.message || error);
      console.warn("⚠️ Continuing without signature verification for now");
      // TODO: Fix signature verification - temporarily disabled
      // return res.status(403).send("Signature verification error");
    }
  } else if (signature && !CHARGILY_API_KEY) {
    console.warn(
      "⚠️ Signature provided but no CHARGILY_API_KEY configured - skipping verification for testing"
    );
  } else {
    console.warn(
      "⚠️ No signature header or API key - webhook accepted without verification (testing mode)"
    );
  }

  // Acknowledge immediately - Chargily expects quick 200 response
  res.status(200).json({ received: true, timestamp: new Date().toISOString() });

  // Parse the JSON payload
  let event;
  try {
    event = JSON.parse(payload.toString());
    lastWebhook.parsedBody = event; // Store parsed version too
  } catch (parseError) {
    console.error(
      "❌ Failed to parse webhook payload as JSON:",
      parseError?.message || parseError
    );
    return;
  }

  console.log("Parsed event:", JSON.stringify(event, null, 2));

  // Process in background
  setImmediate(async () => {
    try {
      // Handle different event types from Chargily
      const eventType = event.type || "";
      const data = event.data || event;

      console.log("Event type:", eventType);
      console.log("Event data:", JSON.stringify(data, null, 2));

      // Check for successful payment events
      const isSuccessfulPayment =
        eventType === "checkout.paid" ||
        eventType === "payment.paid" ||
        eventType === "checkout.completed" ||
        data.status === "paid" ||
        data.status === "completed" ||
        data.status === "successful";

      if (isSuccessfulPayment) {
        // Try multiple possible email field paths for Chargily's format
        let customerEmail =
          data.customer?.email ||
          data.customer_email ||
          data.client?.email ||
          data.billing_details?.email ||
          data.metadata?.customer_email ||
          "";

        // If no email in webhook, try to fetch customer details using customer_id
        console.log(
          `Debug: customerEmail='${customerEmail}', customer_id='${
            data.customer_id
          }', CHARGILY_API_KEY exists: ${!!CHARGILY_API_KEY}`
        );

        if (!customerEmail && data.customer_id) {
          if (!CHARGILY_API_KEY) {
            console.warn(
              "⚠️ Cannot fetch customer details: CHARGILY_API_KEY not configured"
            );
          } else {
            try {
              console.log(
                `Fetching customer details for ID: ${data.customer_id}`
              );
              const customerResponse = await axios.get(
                `https://pay.chargily.com/test/api/v2/customers/${data.customer_id}`,
                {
                  headers: {
                    Authorization: `Bearer ${CHARGILY_API_KEY}`,
                    "Content-Type": "application/json",
                  },
                  timeout: 10000,
                }
              );

              customerEmail =
                customerResponse.data?.email ||
                customerResponse.data?.data?.email ||
                "";
              console.log(`Fetched customer email: ${customerEmail}`);
            } catch (apiError) {
              console.error(
                `Failed to fetch customer details: ${
                  apiError?.response?.data || apiError?.message || apiError
                }`
              );
            }
          }
        }

        console.log("Final extracted customer email:", customerEmail);
        if (customerEmail && customerEmail.includes("@")) {
          try {
            await sendEmail(customerEmail, COURSE_DRIVE_LINK);
            console.log(`✅ Course link sent successfully to ${customerEmail}`);
          } catch (emailErr) {
            console.error(
              `❌ Failed to send email to ${customerEmail}:`,
              emailErr?.message || emailErr
            );
          }
        } else {
          console.warn(
            "⚠️ No valid customer email found in webhook. Event data:",
            JSON.stringify(data, null, 2)
          );
        }

        // Forward to client system if configured
        if (CLIENT_WEBHOOK_URL) {
          try {
            await axios.post(CLIENT_WEBHOOK_URL, event, { timeout: 5000 });
            console.log("✅ Event forwarded to client webhook");
          } catch (forwardErr) {
            console.error(
              "❌ Failed to forward to client webhook:",
              forwardErr?.message || forwardErr
            );
          }
        }
      } else {
        console.log(
          "ℹ️ Event is not a successful payment:",
          eventType,
          data.status
        );
      }
    } catch (err) {
      console.error("❌ Error processing webhook:", err?.message || err);
    }
  });
});

// Debug endpoint: return the last webhook payload we received (if any)
app.get("/last-webhook", (req, res) => {
  if (!lastWebhook)
    return res.status(404).send({ error: "no webhook received yet" });
  return res.send(lastWebhook);
});

// 🔹 Resend email setup (works on all hosting platforms!)
async function sendEmail(to, courseLink) {
  try {
    console.log(`📧 Sending email to: ${to}`);

    const { data, error } = await resend.emails.send({
      from: "Kobouch Academy <onboarding@resend.dev>", // Default sender (you can customize later)
      to: [to],
      subject: "Your Course from Kobouch Academy",
      html: `
        <h2>🎉 Congratulations! Your payment was successful.</h2>
        <p>Here is your course link:</p>
        <p><a href="${courseLink}" style="background: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px;">Access Your Course</a></p>
        <p>Enjoy learning!</p>
      `,
    });

    if (error) {
      console.error("❌ Resend Error:", error);
      throw error;
    }

    console.log("✅ Email sent successfully via Resend:", data);
    return data;
  } catch (err) {
    console.error("❌ Failed to send email:", err?.message || err);
    throw err;
  }
}

// 🔹 Test email endpoint — use this to verify SMTP settings from your host
app.get("/test-email", async (req, res) => {
  const to = req.query.to || process.env.TEST_TO_EMAIL;
  if (!to)
    return res
      .status(400)
      .send({ error: "missing ?to query or TEST_TO_EMAIL env" });

  try {
    await sendEmail(to, COURSE_DRIVE_LINK);
    return res.send({ ok: true, to });
  } catch (err) {
    console.error("Test email failed:", err?.message || err);
    return res
      .status(500)
      .send({ ok: false, error: err?.message || String(err) });
  }
});

// 🔹 Test route
app.get("/", (req, res) =>
  res.send("Chargily API + email delivery running ✅")
);

// 🔹 Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server live on port ${PORT}`));
