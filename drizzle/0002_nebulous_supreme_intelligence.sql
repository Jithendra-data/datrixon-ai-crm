CREATE TABLE `activity_contacts` (
	`workspace_id` text NOT NULL,
	`id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`source` text DEFAULT 'synthetic' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`activity_id` text NOT NULL,
	`contact_id` text NOT NULL,
	PRIMARY KEY(`workspace_id`, `id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`activity_id`) REFERENCES `activities`(`workspace_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`workspace_id`,`contact_id`) REFERENCES `contacts`(`workspace_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_activity_contact` ON `activity_contacts` (`workspace_id`,`activity_id`,`contact_id`);--> statement-breakpoint
CREATE TABLE `ingestion_events` (
	`workspace_id` text NOT NULL,
	`id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`source` text DEFAULT 'synthetic' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`provider` text NOT NULL,
	`external_id` text NOT NULL,
	`account_id` text NOT NULL,
	`contact_id` text NOT NULL,
	`activity_id` text NOT NULL,
	`received_at` text NOT NULL,
	`status` text NOT NULL,
	PRIMARY KEY(`workspace_id`, `id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`account_id`) REFERENCES `accounts`(`workspace_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`workspace_id`,`contact_id`) REFERENCES `contacts`(`workspace_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`workspace_id`,`activity_id`) REFERENCES `activities`(`workspace_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_ingestion_idempotency` ON `ingestion_events` (`workspace_id`,`provider`,`external_id`);--> statement-breakpoint
CREATE TABLE `intelligence_snapshots` (
	`workspace_id` text NOT NULL,
	`id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`source` text DEFAULT 'synthetic' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`account_id` text NOT NULL,
	`captured_at` text NOT NULL,
	`capture_id` text NOT NULL,
	`method` text NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`workspace_id`, `id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`account_id`) REFERENCES `accounts`(`workspace_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_snapshots_account_time` ON `intelligence_snapshots` (`workspace_id`,`account_id`,`captured_at`);--> statement-breakpoint
CREATE TABLE `recommendation_feedback` (
	`workspace_id` text NOT NULL,
	`id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`source` text DEFAULT 'synthetic' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`recommendation_id` text NOT NULL,
	`user_id` text NOT NULL,
	`decision` text NOT NULL,
	`reason_code` text,
	`comment` text,
	PRIMARY KEY(`workspace_id`, `id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`recommendation_id`) REFERENCES `recommendations`(`workspace_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`workspace_id`,`user_id`) REFERENCES `users`(`workspace_id`,`id`) ON UPDATE no action ON DELETE no action
);
