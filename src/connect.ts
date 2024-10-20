import { Pool } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Hono } from "hono";
import { getStripe } from "../utils/exports";
import { churches } from "./db/schema";

export type Env = {
  DATABASE_URL: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_PUBLIC_KEY: string;
  FRONTEND_URL: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_CONNECT_CLIENT_ID: string;
  SERVER_URL: string;
};

export const app = new Hono<{ Bindings: Env }>();

// Simple in-memory store for state
const stateStore = new Map<string, { userId: string; timestamp: number }>();

// Function to clean up expired states (older than 15 minutes)
function cleanupStates() {
  const now = Date.now();
  for (const [state, data] of stateStore.entries()) {
    if (now - data.timestamp > 15 * 60 * 1000) {
      stateStore.delete(state);
    }
  }
}

// Generate OAuth link for account connection
app.get("/oauth/link", async (c) => {
  const userId = c.req.query("userId");

  if (!userId) {
    return c.json({ error: "User ID is required" }, 400);
  }
  const state = crypto.randomUUID();

  // Store the state and userId in memory
  stateStore.set(state, { userId, timestamp: Date.now() });

  // Clean up old states
  cleanupStates();

  // The state parameter is used for security. In a production app, you should store this state and validate it in the callback to prevent CSRF attacks.
  // In a real application, you should store this state and validate it in the callback
  const args = new URLSearchParams({
    state,
    client_id: c.env.STRIPE_CONNECT_CLIENT_ID,
    response_type: "code",
    scope: "read_write",
    redirect_uri: `${c.env.SERVER_URL}/connect/oauth/callback`,
  });

  const url = `https://connect.stripe.com/oauth/authorize?${args.toString()}`;
  return c.json({ url });
});

// Handle OAuth redirect
app.get("/oauth/callback", async (c) => {
  const stripe = getStripe(c.env);
  const { code, state } = c.req.query();

  if (!state || typeof state !== "string") {
    return c.json({ success: false, error: "Invalid state parameter" }, 400);
  }

  // Retrieve userId from memory using the state
  const stateData = stateStore.get(state);
  if (!stateData) {
    return c.json({ success: false, error: "Invalid or expired state" }, 400);
  }

  const { userId } = stateData;

  // Delete the state from memory as it's no longer needed
  stateStore.delete(state);

  const client = new Pool({ connectionString: c.env.DATABASE_URL });

  const db = drizzle(client);

  // This endpoint handles the redirect after a user authorizes your application.
  // It exchanges the authorization code for an access token and connected account ID.
  // In a real application, you should store the connected account ID in your database, associated with the user who initiated the connection.

  // In a real application, you should validate the state here

  try {
    const response = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    });

    const connectedAccountId = response.stripe_user_id;
    // Store this ID in your database, associated with your user
    // TODO: Replace this with your actual database logic

    // Fetch detailed account information
    const account = await stripe.accounts.retrieve(connectedAccountId!);

    await db
      .update(churches)
      .set({
        stripe_account_id: connectedAccountId,
        stripe_account_status: account.charges_enabled ? "active" : "pending",
        stripe_account_type: account.type,
        stripe_account_capabilities: account.capabilities,
        stripe_account_requirements: account.requirements,
        is_stripe_connected: true,
      })
      .where(eq(churches?.user_id, userId));

    return c.redirect(
      `${c.env.FRONTEND_URL}/connect-success?accountId=${connectedAccountId}`
    );
  } catch (err: any) {
    console.error("OAuth error:", err);
    return c.redirect(
      `${c.env.FRONTEND_URL}/connect-error?error=${encodeURIComponent(
        err.message
      )}`
    );
  }
});

// Retrieve account details
app.get("/accounts/:id", async (c) => {
  // This endpoint retrieves details for a specific connected account.
  // Ensure that you have proper authentication and authorization in place to protect this endpoint.

  const stripe = getStripe(c.env);

  const accountId = c.req.param("id");

  const client = new Pool({ connectionString: c.env.DATABASE_URL });

  const db = drizzle(client);

  try {
    const account = await stripe.accounts.retrieve(accountId);

    await db
      .update(churches)
      .set({
        stripe_account_id: accountId,
        stripe_account_status: account.charges_enabled ? "active" : "pending",
        stripe_account_type: account.type,
        stripe_account_capabilities: account.capabilities,
        stripe_account_requirements: account.requirements,
        is_stripe_connected: true,
      })
      .where(eq(churches?.stripe_account_id, accountId));

    return c.json({ success: true, account });
  } catch (error: any) {
    console.error("Error retrieving account:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// List all connected accounts
app.get("/accounts", async (c) => {
  // This endpoint lists all connected accounts.
  // In a real application, you might want to add pagination to this endpoint.
  // Again, ensure proper authentication and authorization.

  const stripe = getStripe(c.env);

  try {
    const accounts = await stripe.accounts.list();
    return c.json({ success: true, accounts: accounts.data });
  } catch (error: any) {
    console.error("Error listing accounts:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;
