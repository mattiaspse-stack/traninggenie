CREATE TABLE `training_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`modalities_json` text NOT NULL,
	`goals_json` text NOT NULL,
	`running_level` text DEFAULT 'none' NOT NULL,
	`strength_level` text DEFAULT 'none' NOT NULL,
	`days_per_week` integer NOT NULL,
	`minutes_per_session` integer NOT NULL,
	`equipment_json` text NOT NULL,
	`preferred_days_json` text NOT NULL,
	`current_training` text,
	`limitations` text,
	`answers_json` text NOT NULL,
	`onboarding_complete` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `app_users`(`id`) ON UPDATE no action ON DELETE cascade
);
