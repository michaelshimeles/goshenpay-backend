import { Pool } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
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
  c.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS"); // Allow specific methods
  c.header("Access-Control-Allow-Headers", "Content-Type"); // Allow specific headers
  return next();
});

app.post("/get-church", async (c) => {
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
      message: "Church fetched successfully",
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

export default app;
