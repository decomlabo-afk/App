import 'dotenv/config';
import express from 'express';
import Stripe from 'stripe';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const PUBLIC_URL = (process.env.PUBLIC_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const PRICE_CENTS = 100; // 1 €

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// --- Compteur des paiements réussis (fichier JSON simple) ---
const COUNT_FILE = path.join(__dirname, 'data', 'count.json');

function readStore() {
  try {
    return JSON.parse(fs.readFileSync(COUNT_FILE, 'utf8'));
  } catch {
    return { count: 0, sessions: [] };
  }
}

function recordPayment(sessionId) {
  const store = readStore();
  if (store.sessions.includes(sessionId)) return store.count; // déjà compté
  store.sessions.push(sessionId);
  store.count += 1;
  fs.mkdirSync(path.dirname(COUNT_FILE), { recursive: true });
  fs.writeFileSync(COUNT_FILE, JSON.stringify(store));
  return store.count;
}

const app = express();

// Le webhook Stripe a besoin du corps brut pour vérifier la signature :
// il doit être déclaré AVANT express.json().
app.post('/api/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return res.sendStatus(503);
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Signature webhook invalide :', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    if (session.payment_status === 'paid') recordPayment(session.id);
  }
  res.json({ received: true });
});

app.use(express.json());

// Crée une page de paiement Stripe Checkout (Apple Pay, Google Pay, CB).
app.post('/api/checkout', async (_req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: "Le paiement n'est pas encore configuré (STRIPE_SECRET_KEY manquante)." });
  }
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'eur',
            unit_amount: PRICE_CENTS,
            product_data: {
              name: "C'est une certitude",
              description: 'Oui, je serai millionnaire.',
            },
          },
        },
      ],
      locale: 'fr',
      success_url: `${PUBLIC_URL}/merci.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${PUBLIC_URL}/`,
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('Erreur Stripe :', err.message);
    res.status(500).json({ error: 'Impossible de créer le paiement. Réessaie dans un instant.' });
  }
});

// Vérifie un paiement au retour de Stripe (et le compte si le webhook ne l'a pas déjà fait).
app.get('/api/verify', async (req, res) => {
  const id = String(req.query.session_id || '');
  if (!stripe || !id.startsWith('cs_')) return res.json({ paid: false, count: readStore().count });
  try {
    const session = await stripe.checkout.sessions.retrieve(id);
    const paid = session.payment_status === 'paid';
    const count = paid ? recordPayment(session.id) : readStore().count;
    res.json({ paid, count });
  } catch {
    res.json({ paid: false, count: readStore().count });
  }
});

app.get('/api/count', (_req, res) => {
  res.json({ count: readStore().count });
});

app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

app.listen(PORT, () => {
  console.log(`✅ App lancée sur ${PUBLIC_URL}`);
  if (!stripe) console.warn('⚠️  STRIPE_SECRET_KEY absente : le bouton affichera un message au lieu du paiement.');
});
