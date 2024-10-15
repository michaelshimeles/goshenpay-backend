CREATE TABLE IF NOT EXISTS "churches" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"church_id" text NOT NULL,
	"stripe_account_id" text,
	"stripe_account_status" text,
	"stripe_account_type" text,
	"stripe_account_capabilities" jsonb,
	"stripe_account_requirements" jsonb,
	"stripe_account_created_at" text,
	"stripe_account_updated_at" text,
	"org_name" text NOT NULL,
	"org_site" text,
	"org_description" text DEFAULT '',
	"org_logo" text DEFAULT '',
	"org_email" text NOT NULL,
	"org_phone" text DEFAULT '',
	"org_address" text DEFAULT '',
	"org_city" text DEFAULT '',
	"org_state" text DEFAULT '',
	"org_zip" text DEFAULT '',
	"org_country" text DEFAULT '',
	"is_stripe_connected" boolean DEFAULT false,
	CONSTRAINT "churches_church_id_unique" UNIQUE("church_id"),
	CONSTRAINT "churches_stripe_account_id_unique" UNIQUE("stripe_account_id")
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
