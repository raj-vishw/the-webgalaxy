CREATE TABLE "admin_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"details" jsonb,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'editor' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_role_check" CHECK (role IN ('admin', 'editor'))
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"website_name" text NOT NULL,
	"url" text NOT NULL,
	"url_normalized" text NOT NULL,
	"description" text NOT NULL,
	"requested_universe_id" uuid,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" uuid,
	"rejection_reason" text,
	"website_id" uuid,
	"submitter_hash" text,
	CONSTRAINT "submissions_status_check" CHECK (status IN ('pending', 'approved', 'rejected')),
	CONSTRAINT "submissions_url_check" CHECK (url ~* '^https?://')
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "universes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"visual_type" text NOT NULL,
	"visual_config" jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "universes_visual_type_check" CHECK (visual_type IN ('spiral', 'cluster', 'nebula', 'stream', 'planetary')),
	CONSTRAINT "universes_slug_format_check" CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "website_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_website_id" uuid NOT NULL,
	"target_website_id" uuid NOT NULL,
	"type" text NOT NULL,
	"strength" real DEFAULT 1 NOT NULL,
	"directed" boolean DEFAULT false NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "website_relationships_type_check" CHECK (type IN ('related', 'alternative', 'integration', 'ecosystem', 'complementary', 'competitor', 'same-company')),
	CONSTRAINT "website_relationships_no_self_check" CHECK (source_website_id <> target_website_id),
	CONSTRAINT "website_relationships_strength_check" CHECK (strength BETWEEN 0 AND 1)
);
--> statement-breakpoint
CREATE TABLE "website_tags" (
	"website_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "website_tags_website_id_tag_id_pk" PRIMARY KEY("website_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "websites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"url" text,
	"url_normalized" text,
	"description" text DEFAULT '' NOT NULL,
	"logo_url" text,
	"universe_id" uuid NOT NULL,
	"object_type" text NOT NULL,
	"importance" integer DEFAULT 50 NOT NULL,
	"popularity_score" integer DEFAULT 50 NOT NULL,
	"trending_score" real DEFAULT 0 NOT NULL,
	"trend_direction" text DEFAULT 'steady' NOT NULL,
	"is_trending" boolean DEFAULT false NOT NULL,
	"is_emerging" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"accent" text,
	"glyph" text,
	"orbit_anchor_id" uuid,
	"position_seed" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "websites_object_type_check" CHECK (object_type IN ('star', 'planet', 'moon', 'comet')),
	CONSTRAINT "websites_trend_direction_check" CHECK (trend_direction IN ('up', 'steady', 'down')),
	CONSTRAINT "websites_importance_check" CHECK (importance BETWEEN 0 AND 100),
	CONSTRAINT "websites_popularity_check" CHECK (popularity_score BETWEEN 0 AND 100),
	CONSTRAINT "websites_trending_score_check" CHECK (trending_score BETWEEN 0 AND 1),
	CONSTRAINT "websites_url_check" CHECK (url IS NULL OR url ~* '^https?://'),
	CONSTRAINT "websites_slug_format_check" CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "websites_no_self_anchor_check" CHECK (orbit_anchor_id IS NULL OR orbit_anchor_id <> id)
);
--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_admin_id_admin_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_requested_universe_id_universes_id_fk" FOREIGN KEY ("requested_universe_id") REFERENCES "public"."universes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_relationships" ADD CONSTRAINT "website_relationships_source_website_id_websites_id_fk" FOREIGN KEY ("source_website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_relationships" ADD CONSTRAINT "website_relationships_target_website_id_websites_id_fk" FOREIGN KEY ("target_website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_tags" ADD CONSTRAINT "website_tags_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_tags" ADD CONSTRAINT "website_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websites" ADD CONSTRAINT "websites_universe_id_universes_id_fk" FOREIGN KEY ("universe_id") REFERENCES "public"."universes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websites" ADD CONSTRAINT "websites_orbit_anchor_id_websites_id_fk" FOREIGN KEY ("orbit_anchor_id") REFERENCES "public"."websites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_log_at_idx" ON "admin_audit_log" USING btree ("at");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_users_email_idx" ON "admin_users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "submissions_status_idx" ON "submissions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "submissions_url_idx" ON "submissions" USING btree ("url_normalized");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_slug_idx" ON "tags" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "universes_slug_idx" ON "universes" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "website_relationships_pair_idx" ON "website_relationships" USING btree (LEAST("source_website_id", "target_website_id"),GREATEST("source_website_id", "target_website_id"),"type");--> statement-breakpoint
CREATE INDEX "website_relationships_source_idx" ON "website_relationships" USING btree ("source_website_id");--> statement-breakpoint
CREATE INDEX "website_relationships_target_idx" ON "website_relationships" USING btree ("target_website_id");--> statement-breakpoint
CREATE INDEX "website_tags_tag_idx" ON "website_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "websites_slug_idx" ON "websites" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "websites_url_normalized_idx" ON "websites" USING btree ("url_normalized");--> statement-breakpoint
CREATE INDEX "websites_universe_idx" ON "websites" USING btree ("universe_id");--> statement-breakpoint
CREATE INDEX "websites_trending_idx" ON "websites" USING btree ("is_trending");--> statement-breakpoint
CREATE INDEX "websites_emerging_idx" ON "websites" USING btree ("is_emerging");