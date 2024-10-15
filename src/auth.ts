import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Hono } from "hono";
import { Webhook } from "svix";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";

export type Env = {
  DATABASE_URL: string;
  CLERK_WEBHOOK_SECRET: string;
};

export const app = new Hono<{ Bindings: Env }>();

app.post("/webhook", async (c) => {
  const WEBHOOK_SECRET = c.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    return c.json("Please add webhook scret from authentication provider", {
      status: 400,
    });
  }

  const svix_id = c.req.header("svix-id");
  const svix_timestamp = c.req.header("svix-timestamp");
  const svix_signature = c.req.header("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return c.json("Error occured -- no svix headers", {
      status: 400,
    });
  }

  // Get the body
  const payload = await c.req.json();

  const body = JSON.stringify(payload);

  // Create a new SVIX instance with your secret
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: any;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (error: any) {
    return c.json("Error occured", {
      status: 400,
    });
  }

  // Get the ID and type
  const { id } = evt?.data;
  const eventType = evt?.type;

  switch (eventType) {
    case "user.created":
      try {
        const { data } = payload || {};
        if (!data) throw new Error("No payload data");

        const result = await userCreate({
          c,
          email: data.email_addresses?.[0]?.email_address,
          first_name: data.first_name,
          last_name: data.last_name,
          profile_image_url: data.profile_image_url,
          user_id: data.id,
        });

        return c.json(result);
      } catch (error: any) {
        console.error("Error creating user:", error);
        return c.json({ success: false, error: error.message }, 400);
      }

    // Uncomment and implement when needed
    case "user.updated":
      // Implementation for user update
      try {
        const { data } = payload || {};
        if (!data) throw new Error("No payload data");

        const result = await userUpdate({
          c,
          email: data.email_addresses?.[0]?.email_address,
          first_name: data.first_name,
          last_name: data.last_name,
          profile_image_url: data.profile_image_url,
          user_id: data.id,
        });

        return c.json(result);
      } catch (error: any) {
        console.error("Error creating user:", error);
        return c.json({ success: false, error: error.message }, 400);
      }
    default:
      return c.json(
        {
          success: true,
          message: "Unhandled event type",
          eventType,
        },
        200
      );
  }
});

const userCreate = async ({
  c,
  email,
  first_name,
  last_name,
  profile_image_url,
  user_id,
}: {
  c: any;
  email: string;
  first_name: string;
  last_name: string;
  profile_image_url: string;
  user_id: string;
}) => {
  try {
    const client = new Pool({ connectionString: c.env.DATABASE_URL });
    const db = drizzle(client);

    await db.insert(users).values({
      email,
      first_name,
      last_name,
      profile_image_url,
      user_id,
    });

    return {
      success: true,
      message: "Church created successfully",
    };
  } catch (error) {
    return {
      success: false,
      error,
    };
  }
};

const userUpdate = async ({
  c,
  email,
  first_name,
  last_name,
  profile_image_url,
  user_id,
}: {
  c: any;
  email: string;
  first_name: string;
  last_name: string;
  profile_image_url: string;
  user_id: string;
}) => {
  try {
    const client = new Pool({ connectionString: c.env.DATABASE_URL });
    const db = drizzle(client);

    await db
      .update(users)
      .set({
        email,
        first_name,
        last_name,
        profile_image_url,
        user_id,
      })
      .where(eq(users.user_id, user_id));

    return {
      success: true,
      message: "User updated successfully",
    };
  } catch (error) {
    return {
      success: false,
      error,
    };
  }
};

export default app;
