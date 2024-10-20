import {
  pgTable,
  serial,
  text,
  timestamp,
  boolean,
  jsonb,
  integer,
  uuid,
} from "drizzle-orm/pg-core";

// Church administrators (users setting up donation sites)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  user_id: text("user_id").unique().notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
  email: text("email").unique(),
  first_name: text("first_name"),
  last_name: text("last_name"),
  profile_image_url: text("profile_image_url"),
  role: text("role").default("admin"), // Could be 'admin', 'manager', etc.
});

export const churches = pgTable("churches", {
  id: serial("id").primaryKey(),
  user_id: text("user_id")
    .references(() => users.user_id)
    .notNull(),
  church_id: text("church_id").unique().notNull(),
  stripe_account_id: text("stripe_account_id").unique(),
  stripe_account_status: text("stripe_account_status"),
  stripe_account_type: text("stripe_account_type"),
  stripe_account_capabilities: jsonb("stripe_account_capabilities"),
  stripe_account_requirements: jsonb("stripe_account_requirements"),
  stripe_account_created_at: timestamp("stripe_account_created_at"),
  stripe_account_updated_at: timestamp("stripe_account_updated_at"),
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

export const stripeEvents = pgTable("stripe_events", {
  id: serial("id").primaryKey(),
  stripeEventId: text("stripe_event_id").notNull().unique(),
  type: text("type").notNull(),
  accountId: text("account_id"),
  objectId: text("object_id"),
  objectType: text("object_type"),
  status: text("status"),
  amount: text("amount"),
  currency: text("currency"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
  data: jsonb("data"),
  error: text("error"),
});

// Donors (people making donations)
export const donors = pgTable("donors", {
  id: serial("id").primaryKey(),
  stripe_customer_id: text("stripe_customer_id").unique(),
  email: text("email"),
  first_name: text("first_name"),
  last_name: text("last_name"),
  phone: text("phone"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const donations = pgTable("donations", {
  id: uuid("id").defaultRandom().primaryKey(),
  donor_id: integer("donor_id").references(() => donors.id),
  church_id: text("church_id")
    .references(() => churches.church_id)
    .notNull(),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull(),
  stripe_payment_intent_id: text("stripe_payment_intent_id").unique(),
  stripe_charge_id: text("stripe_charge_id").unique(),
  status: text("status").notNull(),
  is_recurring: boolean("is_recurring").default(false).notNull(),
  payment_method: text("payment_method"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  donor_id: integer("donor_id").references(() => donors.id),
  church_id: text("church_id")
    .references(() => churches.church_id)
    .notNull(),
  stripe_subscription_id: text("stripe_subscription_id").unique().notNull(),
  status: text("status").notNull(),
  current_period_start: timestamp("current_period_start").notNull(),
  current_period_end: timestamp("current_period_end").notNull(),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull(),
  interval: text("interval").notNull(), // 'day', 'week', 'month', or 'year'
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  canceled_at: timestamp("canceled_at"),
});
