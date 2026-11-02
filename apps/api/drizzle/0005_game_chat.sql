CREATE TABLE "game_chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"sender_user_id" uuid NOT NULL,
	"body" text NOT NULL,
	"client_command_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_chat_messages" ADD CONSTRAINT "game_chat_messages_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_chat_messages" ADD CONSTRAINT "game_chat_messages_sender_user_id_users_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "game_chat_messages_game_created_idx" ON "game_chat_messages" USING btree ("game_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "game_chat_messages_idem_uidx" ON "game_chat_messages" USING btree ("game_id","sender_user_id","client_command_id");
