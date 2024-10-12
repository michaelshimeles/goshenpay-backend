import { Pool } from "@neondatabase/serverless";
import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Hono } from "hono";
import { v4 as uuidv4 } from "uuid";
import { churches } from "./db/schema";

export type Env = {
  DATABASE_URL: string;
};

export const app = new Hono<{ Bindings: Env }>();

// Add CORS middleware
app.use("*", (c, next) => {
  c.header("Access-Control-Allow-Origin", "*"); // Allow all origins
  c.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT"); // Allow specific methods
  c.header("Access-Control-Allow-Headers", "Content-Type"); // Allow specific headers
  return next();
});

app.get("/", (c) => {
  return c.json({
    success: true,
    message: "Welcome to the GoshenPay API",
  });
});

app.post("/get-church", async (c) => {
  try {
    const client = new Pool({ connectionString: c.env.DATABASE_URL });

    const db = drizzle(client);

    const { user_id, church_id } = await c.req.json();

    const result = await db
      .select()
      .from(churches)
      .where(
        and(eq(churches.church_id, church_id), eq(churches.user_id, user_id))
      );

    return c.json({
      success: true,
      message: "Church fetched successfully",
      result,
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
});

app.post("/get-churches", async (c) => {
  try {
    const client = new Pool({ connectionString: c.env.DATABASE_URL });

    const db = drizzle(client);

    const { userId } = await c.req.json();

    const result = await db
      .select()
      .from(churches)
      .where(eq(churches.user_id, userId));

    return c.json({
      success: true,
      message: "Churches fetched successfully",
      result,
    });
  } catch (error) {
    console.log(error);
    return c.json(
      {
        success: false,
        error,
      },
      400
    );
  }
});

app.post("/create-church", async (c) => {
  try {
    const client = new Pool({ connectionString: c.env.DATABASE_URL });

    const db = drizzle(client);

    const {
      org_name,
      org_site,
      org_email,
      org_phone,
      org_address,
      org_city,
      org_state,
      org_zip,
      org_country,
      org_description,
      org_logo,
      userId,
    } = await c.req.json();

    await db.insert(churches).values({
      church_id: uuidv4(),
      org_name,
      org_site,
      org_email,
      org_phone,
      org_address,
      org_city,
      org_state,
      org_zip,
      org_country,
      org_description,
      org_logo,
      user_id: userId,
    });

    return c.json({
      success: true,
      message: "Church created successfully",
    });
  } catch (error) {
    console.log(error);
    return c.json(
      {
        success: false,
        error,
      },
      400
    );
  }
});

app.post("/update-church", async (c) => {
  try {
    const client = new Pool({ connectionString: c.env.DATABASE_URL });

    const db = drizzle(client);

    const payload = await c.req.json();

    console.log("FIRED", payload);
    await db
      .update(churches)
      .set({
        org_name: payload.org_name,
        org_site: payload.org_site,
        org_email: payload.org_email,
        org_phone: payload.org_phone,
        org_address: payload.org_address,
        org_city: payload.org_city,
        org_state: payload.org_state,
        org_zip: payload.org_zip,
        org_country: payload.org_country,
        org_description: payload.org_description,
        org_logo: payload.org_logo,
      })
      .where(eq(churches.church_id, payload.church_id));

    return c.json({
      success: true,
      message: "Church updated successfully",
    });
  } catch (error) {
    console.log(error);
    return c.json(
      {
        success: false,
        error,
      },
      400
    );
  }
});

app.post("/delete-church", async (c) => {
  try {
    const client = new Pool({ connectionString: c.env.DATABASE_URL });

    const db = drizzle(client);

    const { church_id, user_id } = await c.req.json();

    console.log("DELETE", church_id);

    const result = await db
      .delete(churches)
      .where(eq(churches.church_id, church_id))
      .finally();

    return c.json({
      success: true,
      message: "Church has been deleted successfully",
    });
  } catch (error) {
    console.log(error);
    return c.json(
      {
        success: false,
        error,
      },
      400
    );
  }
});

export default app;
