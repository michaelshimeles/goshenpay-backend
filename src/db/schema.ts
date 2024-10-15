// db/schema.ts
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  user_id: text("user_id").unique().notNull(),
  created_at: text("created_at").notNull(),
  email: text("email").unique(),
  first_name: text("first_name"),
  last_name: text("last_name"),
  profile_image_url: text("profile_image_url"),
});

export const churches = pgTable("churches", {
  id: serial("id").primaryKey(),
  user_id: text("user_id"),
  church_id: text("church_id"),
  org_name: text("org_name"),
  org_site: text("org_site"),
  org_description: text("org_description").default(""),
  org_logo: text("org_logo").default(""),
  org_email: text("org_email").default(""),
  org_phone: text("org_phone").default(""),
  org_address: text("org_address").default(""),
  org_city: text("org_city").default(""),
  org_state: text("org_state").default(""),
  org_zip: text("org_zip").default(""),
  org_country: text("org_country").default(""),
});
