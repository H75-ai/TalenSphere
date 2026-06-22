// server.js
const express = require('express');
const cors = require('cors');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// STRICT PAYMENT GATEWAY CONFIGURATION
// Add your Razorpay Key ID and Secret below
// ==========================================
const RAZORPAY_KEY_ID = 'YOUR_RAZORPAY_KEY_ID_HERE'; 
const RAZORPAY_KEY_SECRET = 'YOUR_RAZORPAY_KEY_SECRET_HERE';

const razorpayInstance = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET
});

// Endpoint 1: Create a secure Order ID
app.post('/api/payment/create', async (req, res) => {
    try {
        const { amount } = req.body;

        // Strict validation: Check if amount is a valid positive number
        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({ error: "Invalid payment amount." });
        }

        // Razorpay expects amount in paise (multiply by 100)
        const options = {
            amount: Math.round(amount * 100), 
            currency: "INR",
            receipt: `receipt_order_${Date.now()}`
        };

        const order = await razorpayInstance.orders.create(options);
        res.json(order);
    } catch (error) {
        console.error("Order Creation Error:", error);
        res.status(500).json({ error: "Failed to create order" });
    }
});

// Endpoint 2: Verify the payment signature securely on the server
app.post('/api/payment/verify', (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        // Create HMAC to verify the signature strictly
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature === razorpay_signature) {
            // Payment is legit
            res.json({ success: true, message: "Payment verified successfully" });
        } else {
            // Tampered payment
            res.status(400).json({ success: false, message: "Invalid signature. Payment verification failed." });
        }
    } catch (error) {
        console.error("Verification Error:", error);
        res.status(500).json({ error: "Failed to verify payment" });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Backend securely running on http://localhost:${PORT}`);
});