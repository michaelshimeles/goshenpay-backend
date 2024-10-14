import Stripe from "stripe";

export type Env = {
  DATABASE_URL: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_PUBLIC_KEY: string;
  FRONTEND_URL: string;
};

let stripe: Stripe | null = null;

export function getStripe(env: Env) {
  if (!stripe) {
    stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-09-30.acacia",
      typescript: true,
    });
  }
  return stripe;
}