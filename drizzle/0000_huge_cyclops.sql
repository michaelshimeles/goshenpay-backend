CREATE TABLE IF NOT EXISTS "churches" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text,
	"church_id" text,
	"org_name" text,
	"org_site" text,
	"org_description" text DEFAULT '',
	"org_logo" text DEFAULT '',
	"org_email" text DEFAULT '',
	"org_phone" text DEFAULT '',
	"org_address" text DEFAULT '',
	"org_city" text DEFAULT '',
	"org_state" text DEFAULT '',
	"org_zip" text DEFAULT '',
	"org_country" text DEFAULT ''
);
