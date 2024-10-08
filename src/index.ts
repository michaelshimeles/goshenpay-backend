import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Hono } from "hono";

export type Env = {
  DATABASE_URL: string;
};

export const app = new Hono<{ Bindings: Env }>();

app.post("/create-church", async (c) => {
  try {
    const client = new Pool({ connectionString: c.env.DATABASE_URL });

    const db = drizzle(client);

    const { org_name, org_site } = await c.req.json();

    return c.json({
      message: "Church created successfully",
    });
  } catch (error) {
    console.log(error);
    return c.json(
      {
        error,
      },
      400
    );
  }
});

export default app;
