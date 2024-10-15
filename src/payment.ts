import { Hono } from "hono";
import { getStripe } from "../utils/exports";
export type Env = {
  DATABASE_URL: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_PUBLIC_KEY: string;
  FRONTEND_URL: string;
  STRIPE_WEBHOOK_SECRET: string;
};

export const app = new Hono<{ Bindings: Env }>();

app
  .post("/donate/payment", async (c) => {
    try {
      const stripe = getStripe(c.env);

      const { amount } = await c.req.json();

      const session = await stripe.checkout.sessions.create({
        mode: "payment", // payment or subscription
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
    } catch (error) {
      return c.json(
        {
          success: false,
          error,
        },
        400
      );
    }
  })
  .post("/donate/subscription", async (c) => {
    const { amount, interval } = await c.req.json();

    const stripe = getStripe(c.env);

    // Validate interval
    if (!["week", "month", "year"].includes(interval)) {
      return c.json(
        {
          success: false,
          message: "Invalid interval. Use 'week', 'month', or 'year'.",
        },
        400
      );
    }

    try {
      // Create a product for this donation
      const product = await stripe.products.create({
        name: `${interval}ly Donation`,
        type: "service",
      });

      // Create a price for this product
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(amount) * 100, // amount in cents
        currency: "cad",
        recurring: { interval: interval },
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
        success_url: "http://localhost:3000/success",
        cancel_url: "http://localhost:3000/cancel",
      });

      return c.json({
        success: true,
        message: "Subscription session created",
        session,
      });
    } catch (error: any) {
      console.error("Error:", error);
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
