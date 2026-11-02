CREATE TABLE "games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mode" text DEFAULT 'live' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"phase" text DEFAULT 'active_play' NOT NULL,
	"board_size" integer NOT NULL,
	"komi" text NOT NULL,
	"handicap" integer DEFAULT 0 NOT NULL,
	"clock_mode" text DEFAULT 'none' NOT NULL,
	"color_mode" text DEFAULT 'random' NOT NULL,
	"black_user_id" uuid NOT NULL,
	"white_user_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"engine_blob" text NOT NULL,
	"board_snapshot" jsonb NOT NULL,
	"move_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"overlays" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"clock" jsonb,
	"result" jsonb,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "game_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text DEFAULT 'live' NOT NULL,
	"inviter_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"settings" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"resolved_at" timestamp with time zone,
	"game_id" uuid
);
--> statement-breakpoint
CREATE TABLE "live_game_occupancy" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"game_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_command_receipts" (
	"game_id" uuid NOT NULL,
	"command_id" text NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"version_after" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_black_user_id_users_id_fk" FOREIGN KEY ("black_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_white_user_id_users_id_fk" FOREIGN KEY ("white_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_invites" ADD CONSTRAINT "game_invites_inviter_id_users_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_invites" ADD CONSTRAINT "game_invites_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_game_occupancy" ADD CONSTRAINT "live_game_occupancy_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_game_occupancy" ADD CONSTRAINT "live_game_occupancy_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_command_receipts" ADD CONSTRAINT "game_command_receipts_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_command_receipts" ADD CONSTRAINT "game_command_receipts_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "game_command_receipts_uidx" ON "game_command_receipts" USING btree ("game_id","command_id");--> statement-breakpoint
CREATE INDEX "game_invites_recipient_status_idx" ON "game_invites" USING btree ("recipient_id","status");--> statement-breakpoint
CREATE INDEX "game_invites_inviter_status_idx" ON "game_invites" USING btree ("inviter_id","status");
