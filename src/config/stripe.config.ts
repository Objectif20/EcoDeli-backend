import Stripe from 'stripe';

// Création de l'instance Stripe
const stripeSecretKey = process.env.STRIPE_SK_SECRET;
if (!stripeSecretKey) {
    throw new Error('La clé Stripe n\'est pas définie');
}
export const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2025-02-24.acacia', // Version de l'API Stripe actuellement utilisée
    typescript: true, // Utilisation de TypeScript
});
