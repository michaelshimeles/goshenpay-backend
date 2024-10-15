import { Hono } from "hono";
import { getStripe } from "../utils/exports";
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
// Generate OAuth link for account connection
app.get("/oauth/link", async (c) => {
  console.log("Client ID:", c.env.STRIPE_CONNECT_CLIENT_ID);
  const state = Math.random().toString(36).substring(7); // Generate a random state
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
    // await saveConnectedAccount(c.get("userId"), connectedAccountId);

    return c.json({ success: true, account_id: connectedAccountId });
  } catch (err: any) {
    console.error("OAuth error:", err);
    return c.json({ success: false, error: err.message }, 400);
  }
});

// {"success":true,"account_id":"acct_1Q9uMzCQDtKM6H6l"}

// Retrieve account details
app.get("/accounts/:id", async (c) => {
  // This endpoint retrieves details for a specific connected account.
  // Ensure that you have proper authentication and authorization in place to protect this endpoint.

  const stripe = getStripe(c.env);

  const accountId = c.req.param("id");
  try {
    const account = await stripe.accounts.retrieve(accountId);
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

// https://connect.stripe.com/oauth/authorize?redirect_uri=https://connect.stripe.com/hosted/oauth&client_id=ca_R1ZfmVf6KeTWof1xH9Z3fDTCzusikoye&state=onbrd_R1xThHBf0aTatIxFDBKUbEWS49&response_type=code&scope=read_write&stripe_user[country]=CA
export default app;
