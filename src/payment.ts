import { Hono } from "hono";
import { getStripe } from "../utils/exports";
export type Env = {
  DATABASE_URL: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_PUBLIC_KEY: string;
  FRONTEND_URL: string;
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
export default app;
