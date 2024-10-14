import { Pool } from "@neondatabase/serverless";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Hono } from "hono";
import { v4 as uuidv4 } from "uuid";
import { churches } from "./db/schema";

export type Env = {
  DATABASE_URL: string;
};

export const app = new Hono<{ Bindings: Env }>();

app
  .post("/create", async (c) => {
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

      if (
        !org_name &&
        !org_site &&
        !org_email &&
        !org_phone &&
        !org_address &&
        !org_city &&
        !org_state &&
        !org_zip &&
        !org_country &&
        !org_description &&
        !org_logo &&
        !userId
      ) {
        throw new Error("Missing item or item(s)");
      }

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
  })
  .post("/update", async (c) => {
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
        church_id,
      } = await c.req.json();

      if (
        !org_name &&
        !org_site &&
        !org_email &&
        !org_phone &&
        !org_address &&
        !org_city &&
        !org_state &&
        !org_zip &&
        !org_country &&
        !org_description &&
        !org_logo &&
        !userId &&
        !church_id
      ) {
        throw new Error("Missing item or item(s)");
      }
      await db
        .update(churches)
        .set({
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
        })
        .where(eq(churches.church_id, church_id));

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
  })
  .post("/delete", async (c) => {
    try {
      const client = new Pool({ connectionString: c.env.DATABASE_URL });

      const db = drizzle(client);

      const { church_id } = await c.req.json();

      if (!church_id) {
        throw new Error("Missing item or item(s)");
      }

      await db
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

app.post("/get-church", async (c) => {
  try {
    const client = new Pool({ connectionString: c.env.DATABASE_URL });

    const db = drizzle(client);

    const { user_id, church_id } = await c.req.json();

    if (!user_id && !church_id) {
      throw new Error("Missing item or item(s)");
    }
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

    if (!userId) {
      throw new Error("Missing item or item(s)");
    }

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

export default app;
