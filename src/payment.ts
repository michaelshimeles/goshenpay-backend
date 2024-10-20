import { Pool } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import { drizzle, NeonDatabase } from "drizzle-orm/neon-serverless";
import { Hono } from "hono";
import Stripe from "stripe";
import { getStripe } from "../utils/exports";
import {
  churches,
  donations,
  donors,
  stripeEvents,
  subscriptions,
} from "./db/schema";

export type Env = {
  DATABASE_URL: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_PUBLIC_KEY: string;
  FRONTEND_URL: string;
  STRIPE_WEBHOOK_SECRET: string;
};

export const app = new Hono<{ Bindings: Env }>();

app.post("/donate/fixed", async (c) => {
  try {
    const stripe = getStripe(c.env);
    const { amount, church_id } = await c.req.json();

    // Fetch the church's Stripe account ID
    const client = new Pool({ connectionString: c.env.DATABASE_URL });
    const db = drizzle(client);

    const churchResult = await db
      .select({ stripe_account_id: churches.stripe_account_id })
      .from(churches)
      .where(eq(churches.church_id, church_id))
      .limit(1);

    if (churchResult.length === 0 || !churchResult[0].stripe_account_id) {
      return c.json(
        {
          success: false,
          message: "Church not found or not connected to Stripe",
        },
        404
      );
    }

    const connectedAccountId = churchResult[0].stripe_account_id;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_intent_data: {
        application_fee_amount: Math.round(amount * 0.05), // 5% fee, adjust as needed
        transfer_data: {
          destination: connectedAccountId,
        },
      },
      line_items: [
        {
          price_data: {
            currency: "cad",
            unit_amount: Math.round(amount) * 100,
            product_data: {
              name: "Donation",
              description: "Donating to church",
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${c.env.FRONTEND_URL}/success`,
      cancel_url: `${c.env.FRONTEND_URL}/cancel`,
    });

    return c.json({
      success: true,
      message: "Session created",
      session,
    });
  } catch (error: any) {
    console.error("Error creating payment session:", error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

app.post("/donate/subscription", async (c) => {
  try {
    const stripe = getStripe(c.env);
    const { amount, interval, church_id } = await c.req.json();

    if (!["week", "month", "year"].includes(interval?.slice(0, -2))) {
      return c.json(
        {
          success: false,
          message: "Invalid interval. Use 'week', 'month', or 'year'.",
        },
        400
      );
    }

    // Fetch the church's Stripe account ID
    const client = new Pool({ connectionString: c.env.DATABASE_URL });
    const db = drizzle(client);

    const churchResult = await db
      .select({ stripe_account_id: churches.stripe_account_id })
      .from(churches)
      .where(eq(churches.church_id, church_id))
      .limit(1);

    if (churchResult.length === 0 || !churchResult[0].stripe_account_id) {
      return c.json(
        {
          success: false,
          message: "Church not found or not connected to Stripe",
        },
        404
      );
    }

    const connectedAccountId = churchResult[0].stripe_account_id;

    // Create a product for this donation
    const product = await stripe.products.create({
      name: `${interval} Donation`,
      type: "service",
    });

    // Create a price for this product
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(amount) * 100,
      currency: "cad",
      recurring: { interval: interval.slice(0, -2) },
    });
    // Create a Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      payment_method_types: ["card"],
      subscription_data: {
        application_fee_percent: 5, // 5% fee, adjust as needed
        transfer_data: {
          destination: connectedAccountId,
        },
      },
      success_url: `${c.env.FRONTEND_URL}/success`,
      cancel_url: `${c.env.FRONTEND_URL}/cancel`,
    });

    return c.json({
      success: true,
      message: "Subscription session created",
      session,
    });
  } catch (error: any) {
    console.error("Error creating subscription session:", error);
    return c.json({ success: false, message: error.message }, 500);
  }
});

app.post("/webhook", async (c) => {
  const stripe = getStripe(c.env);

  const sig = c.req.header("stripe-signature");
  const rawBody = await c.req.raw.text();

  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      sig!,
      c.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return c.text("Webhook signature verification failed", 400);
  }

  const client = new Pool({ connectionString: c.env.DATABASE_URL });
  const db = drizzle(client);

  // Log the event
  try {
    await logStripeEvent(db, event);
  } catch (error) {
    console.error("Error logging event to database:", error);
  }

  // Process the event
  try {
    switch (event.type) {
      case "payment_intent.succeeded":
      case "payment_intent.payment_failed":
      case "charge.succeeded":
      case "charge.failed":
        // await handlePaymentEvent(event, db);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        // await handleSubscriptionEvent(event);
        break;
      case "account.updated":
        // await handleAccountEvent(event);
        break;
      case "payout.paid":
      case "payout.failed":
        // await handlePayoutEvent(event);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  } catch (error) {
    console.error(`Error processing event ${event.type}:`, error);
    await updateEventWithError(db, event.id, error);
    return c.text("Webhook processing failed", 500);
  }

  return c.text("Received", 200);
});

async function logStripeEvent(db: any, event: Stripe.Event) {
  await db.insert(stripeEvents).values({
    stripeEventId: event.id,
    type: event.type,
    accountId: (event.account as string) || null,
    objectId: "id" in event.data.object ? event.data.object.id : null,
    objectType: event.data.object.object,
    status: "status" in event.data.object ? event.data.object.status : null,
    amount: (event.data.object as any).amount?.toString() || null,
    currency: (event.data.object as any).currency || null,
    data: event.data.object,
  });
}

async function updateEventWithError(db: any, eventId: string, error: any) {
  await db
    .update(stripeEvents)
    .set({ error: (error as Error).message })
    .where(eq(stripeEvents.stripeEventId, eventId));
}

export default app;
