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
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"email" text,
	"first_name" text,
	"last_name" text,
	"profile_image_url" text,
	CONSTRAINT "users_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
