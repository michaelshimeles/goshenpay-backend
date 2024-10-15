import { Hono } from "hono";
import { getStripe } from "../utils/exports";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { churches } from "./db/schema";
import { eq } from "drizzle-orm";

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
    const { amount, churchId } = await c.req.json();

    // Fetch the church's Stripe account ID
    const client = new Pool({ connectionString: c.env.DATABASE_URL });
    const db = drizzle(client);
    const churchResult = await db
      .select({ stripe_account_id: churches.stripe_account_id })
      .from(churches)
      .where(eq(churches.church_id, churchId))
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
    const { amount, interval, churchId } = await c.req.json();

    if (!["week", "month", "year"].includes(interval)) {
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
      .where(eq(churches.church_id, churchId))
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
      name: `${interval}ly Donation`,
      type: "service",
    });

    // Create a price for this product
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(amount) * 100,
      currency: "cad",
      recurring: { interval: interval },
    });

    // Create a Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_intent_data: {
        // application_fee_percent: 5, // 5% fee, adjust as needed
        transfer_data: {
          destination: connectedAccountId,
        },
      },
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
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

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig!,
      c.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return c.text("Webhook signature verification failed", 400);
  }

  // Handle the event
  switch (event.type) {
    case "account.updated":
      console.log("Account updated:", event.data.object.id);
      break;
    case "account.application.deauthorized":
      console.log("Account application deauthorized:", event.data.object.id);
      break;
    case "account.external_account.created":
      console.log(
        "External account created for account:",
        event.data.object.account
      );
      break;
    case "account.external_account.deleted":
      console.log(
        "External account deleted for account:",
        event.data.object.account
      );
      break;
    case "account.external_account.updated":
      console.log(
        "External account updated for account:",
        event.data.object.account
      );
      break;
    case "payment_intent.succeeded":
      console.log("Payment intent succeeded:", event.data.object.id);
      // try {
      //   const paymentIntent = event.data.object;
      //   await updateOrderStatus(paymentIntent.metadata.orderId, "paid");
      //   await sendPaymentConfirmationEmail(paymentIntent.receipt_email);
      //   // If this payment was for a connected account, you might do something like:
      //   if (
      //     paymentIntent.transfer_data &&
      //     paymentIntent.transfer_data.destination
      //   ) {
      //     await updateConnectedAccountBalance(
      //       paymentIntent.transfer_data.destination,
      //       paymentIntent.amount
      //     );
      //   }
      // } catch (error) {
      //   console.error("Error processing payment_intent.succeeded:", error);
      //   // Depending on your error handling strategy, you might want to rethrow the error
      //   // or return an error response
      // }

      break;
    case "payment_intent.payment_failed":
      console.log("Payment intent failed:", event.data.object.id);
      break;
    case "charge.succeeded":
      console.log("Charge succeeded:", event.data.object.id);
      break;
    case "charge.failed":
      console.log("Charge failed:", event.data.object.id);
      break;
    case "payout.created":
      console.log("Payout created:", event.data.object.id);
      break;
    case "payout.failed":
      console.log("Payout failed:", event.data.object.id);
      break;
    case "payout.paid":
      console.log("Payout paid:", event.data.object.id);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return c.text("Received", 200);
});

export default app;
