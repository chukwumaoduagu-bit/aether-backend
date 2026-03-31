// AETHER Backend - FIXED Stripe Webhook Version
import express from 'express';
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-01-28.clover' })
  : null;

// ⚠️ IMPORTANT: DO NOT use express.json() globally yet!
// We'll apply it only to routes that need parsed JSON

// Health check (doesn't need JSON parsing)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'AETHER Backend',
    stripe: stripe ? 'connected' : 'not-configured'
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Hello from AETHER! 🚀' });
});

// Test payment endpoint (needs JSON parsing)
app.post('/api/test/payment', express.json(), (req, res) => {
  console.log('🧪 Test payment triggered');
  handlePaymentSuccess({
    customer_details: { email: 'test@example.com', name: 'Test User' },
    amount_total: 9900,
    id: 'cs_test_mock'
  });
  res.json({ message: 'Test payment processed! 💰' });
});

// ============================================
// STRIPE WEBHOOK - MUST USE express.raw() FIRST!
// ============================================

if (stripe) {
  // ⚠️ express.raw() MUST come before any JSON parsing for this route
  app.post('/webhook/stripe', 
    express.raw({ type: 'application/json' }), 
    async (req, res) => {
      const sig = req.headers['stripe-signature'];
      
      let event;
      try {
        // Stripe needs the RAW body buffer for signature verification
        event = stripe.webhooks.constructEvent(
          req.body,  // This is now a Buffer, not a parsed object ✅
          sig,
          process.env.STRIPE_WEBHOOK_SECRET
        );
        console.log('✅ Webhook signature verified');
      } catch (err) {
        console.error('❌ Webhook signature failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      // Handle the event
      switch (event.type) {
        case 'checkout.session.completed':
          console.log('🎉 Event: checkout.session.completed');
          await handlePaymentSuccess(event.data.object);
          break;
        case 'payment_intent.succeeded':
          console.log('✅ Event: payment_intent.succeeded');
          break;
        case 'payment_intent.payment_failed':
          console.log('❌ Event: payment_intent.payment_failed');
          break;
        default:
          console.log(`📦 Unhandled event: ${event.type}`);
      }

      res.json({ received: true });
    }
  );
}

// NOW apply JSON parsing to all other POST routes
app.use(express.json());

// AI Chat endpoint (needs JSON parsing)
app.post('/api/ai/chat', async (req, res) => {
  if (!process.env.GEMINI_API_KEY) {
    return res.json({ response: "AI not configured" });
  }
  
  try {
    const { message } = req.body;
    // ... AI logic here
    res.json({ response: "AI response placeholder" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Handle successful payment
const handlePaymentSuccess = async (session) => {
  const customerEmail = session.customer_details?.email;
  const customerName = session.customer_details?.name;
  const amount = session.amount_total / 100; // Convert cents to dollars
  
  console.log('');
  console.log('💰'.repeat(10));
  console.log(`💰 PAYMENT RECEIVED: $${amount} from ${customerEmail}`);
  console.log(`👤 Customer: ${customerName || 'Unknown'}`);
  console.log(`🆔 Session: ${session.id}`);
  console.log('🎉 Node registration automated!');
  console.log('💰'.repeat(10));
  console.log('');
};

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔════════════════════════════════════╗');
  console.log('║  💰 AETHER Payment Server Ready!  ║');
  console.log('╠════════════════════════════════════╣');
  console.log(`║  🌐 http://localhost:${PORT}                ║`);
  console.log(`║  🔍 /api/health                 ║`);
  console.log(`║  💳 /webhook/stripe (POST)      ║`);
  console.log(`║  🧪 /api/test/payment (POST)    ║`);
  console.log('╚════════════════════════════════════╝');
  console.log('');
  console.log(`Stripe: ${stripe ? '✅ Connected' : '⚠️ Add STRIPE_SECRET_KEY to .env'}`);
  console.log('');
});

server.on('error', (err) => {
  console.error('❌ Server error:', err.message);
  process.exit(1);
});