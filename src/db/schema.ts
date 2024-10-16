import {
  pgTable,
  serial,
  text,
  timestamp,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  user_id: text("user_id").unique().notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
  email: text("email").unique(),
  first_name: text("first_name"),
  last_name: text("last_name"),
  profile_image_url: text("profile_image_url"),
});

export const churches = pgTable("churches", {
  id: serial("id").primaryKey(),
  user_id: text("user_id").notNull(),
  church_id: text("church_id").unique().notNull(),
  stripe_account_id: text("stripe_account_id").unique(),
  stripe_account_status: text("stripe_account_status"),
  stripe_account_type: text("stripe_account_type"),
  stripe_account_capabilities: jsonb("stripe_account_capabilities"),
  stripe_account_requirements: jsonb("stripe_account_requirements"),
  stripe_account_created_at: text("stripe_account_created_at"),
  stripe_account_updated_at: text("stripe_account_updated_at"),
  org_name: text("org_name").notNull(),
  org_site: text("org_site"),
  org_description: text("org_description").default(""),
  org_logo: text("org_logo").default(""),
  org_email: text("org_email").notNull(),
  org_phone: text("org_phone").default(""),
  org_address: text("org_address").default(""),
  org_city: text("org_city").default(""),
  org_state: text("org_state").default(""),
  org_zip: text("org_zip").default(""),
  org_country: text("org_country").default(""),
  is_stripe_connected: boolean("is_stripe_connected").default(false),
  donation_configuration: jsonb("donation_configuration"),
});
