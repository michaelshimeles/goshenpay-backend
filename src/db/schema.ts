// db/schema.ts
import { pgTable, serial, text } from "drizzle-orm/pg-core";

export const churches = pgTable("churches", {
  id: serial("id").primaryKey(),
  org_name: text("org_name"),
  org_site: text("org_site"),
  org_type: text("org_type").default(""),
  org_description: text("org_description").default(""),
  org_logo: text("org_logo").default(""),
  org_banner: text("org_banner").default(""),
  org_email: text("org_email").default(""),
  org_phone: text("org_phone").default(""),
  org_address: text("org_address").default(""),
  org_city: text("org_city").default(""),
  org_state: text("org_state").default(""),
  org_zip: text("org_zip").default(""),
});
