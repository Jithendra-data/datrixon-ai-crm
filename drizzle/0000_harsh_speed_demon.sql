CREATE TABLE `account_tags` (
	`workspace_id` text NOT NULL,
	`id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`source` text DEFAULT 'synthetic' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`account_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`workspace_id`, `id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`account_id`) REFERENCES `accounts`(`workspace_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`workspace_id`,`tag_id`) REFERENCES `tags`(`workspace_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `accounts` (
	`workspace_id` text NOT NULL,
	`id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`source` text DEFAULT 'synthetic' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`name` text NOT NULL,
	`domain` text NOT NULL,
	`industry` text NOT NULL,
	`owner_id` text,
	`territory_id` text,
	`status` text NOT NULL,
	`employees` integer NOT NULL,
	`renewal_date` text,
	`priorities` text NOT NULL,
	PRIMARY KEY(`workspace_id`, `id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`owner_id`) REFERENCES `users`(`workspace_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`workspace_id`,`territory_id`) REFERENCES `territories`(`workspace_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_accounts_owner` ON `accounts` (`workspace_id`,`owner_id`);--> statement-breakpoint
CREATE TABLE `activities` (
	`workspace_id` text NOT NULL,
	`id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`source` text DEFAULT 'synthetic' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`account_id` text NOT NULL,
	`opportunity_id` text,
	`owner_id` text NOT NULL,
	`kind` text NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`occurred_at` text NOT NULL,
	`sentiment` text DEFAULT 'neutral' NOT NULL,
	PRIMARY KEY(`workspace_id`, `id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`account_id`) REFERENCES `accounts`(`workspace_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`workspace_id`,`opportunity_id`) REFERENCES `opportunities`(`workspace_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`workspace_id`,`owner_id`) REFERENCES `users`(`workspace_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_activities_account_time` ON `activities` (`workspace_id`,`account_id`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `agent_runs` (
	`workspace_id` text NOT NULL,
	`id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`source` text DEFAULT 'synthetic' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`agent` text NOT NULL,
	`trigger` text NOT NULL,
	`records_reviewed` integer NOT NULL,
	`result` text NOT NULL,
	`confidence` text NOT NULL,
	`status` text NOT NULL,
	`approval_required` integer NOT NULL,
	PRIMARY KEY(`workspace_id`, `id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ai_requests` (
	`workspace_id` text NOT NULL,
	`id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`source` text DEFAULT 'synthetic' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`user_id` text NOT NULL,
	`intent` text NOT NULL,
	`status` text NOT NULL,
	`provider` text NOT NULL,
	`record_count` integer NOT NULL,
	`duration_ms` integer NOT NULL,
	PRIMARY KEY(`workspace_id`, `id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `approvals` (
	`workspace_id` text NOT NULL,
	`id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`source` text DEFAULT 'synthetic' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`recommendation_id` text NOT NULL,
	`requested_by` text NOT NULL,
	`decided_by` text,
	`status` text NOT NULL,
	`action` text NOT NULL,
	PRIMARY KEY(`workspace_id`, `id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`recommendation_id`) REFERENCES `recommendations`(`workspace_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `audit_events` (
	`workspace_id` text NOT NULL,
	`id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`source` text DEFAULT 'synthetic' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`detail` text NOT NULL,
	`request_id` text NOT NULL,
	PRIMARY KEY(`workspace_id`, `id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_audit_time` ON `audit_events` (`workspace_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `campaigns` (
	`workspace_id` text NOT NULL,
	`id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`source` text DEFAULT 'synthetic' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`name` text NOT NULL,
	`channel` text NOT NULL,
	`status` text NOT NULL,
	PRIMARY KEY(`workspace_id`, `id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `cases` (
	`workspace_id` text NOT NULL,
	`id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`source` text DEFAULT 'synthetic' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`account_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`subject` text NOT NULL,
	`severity` text NOT NULL,
	`status` text NOT NULL,
	PRIMARY KEY(`workspace_id`, `id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`account_id`) REFERENCES `accounts`(`workspace_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`workspace_id` text NOT NULL,
	`id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`source` text DEFAULT 'synthetic' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`account_id` text,
	`name` text NOT NULL,
	`email` text,
	`title` text NOT NULL,
	`influence` text NOT NULL,
	PRIMARY KEY(`workspace_id`, `id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`account_id`) REFERENCES `accounts`(`workspace_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_contacts_account` ON `contacts` (`workspace_id`,`account_id`);--> statement-breakpoint
CREATE TABLE `data_sources` (
	`workspace_id` text NOT NULL,
	`id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`source` text DEFAULT 'synthetic' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`last_sync_at` text,
	PRIMARY KEY(`workspace_id`, `id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`workspace_id` text NOT NULL,
	`id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`source` text DEFAULT 'synthetic' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`name` text NOT NULL,
	`company` text NOT NULL,
	`email` text,
	`owner_id` text NOT NULL,
	`campaign_id` text,
	`status` text NOT NULL,
	`estimated_value` integer NOT NULL,
	PRIMARY KEY(`workspace_id`, `id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`campaign_id`) REFERENCES `campaigns`(`workspace_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `memories` (
	`workspace_id` text NOT NULL,
	`id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`source` text DEFAULT 'synthetic' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`account_id` text NOT NULL,
	`summary` text NOT NULL,
	`evidence` text NOT NULL,
	`method` text NOT NULL,
	PRIMARY KEY(`workspace_id`, `id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`account_id`) REFERENCES `accounts`(`workspace_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `notes` (
	`workspace_id` text NOT NULL,
	`id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`source` text DEFAULT 'synthetic' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`account_id` text NOT NULL,
	`author_id` text NOT NULL,
	`body` text NOT NULL,
	PRIMARY KEY(`workspace_id`, `id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`account_id`) REFERENCES `accounts`(`workspace_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`workspace_id` text NOT NULL,
	`id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`source` text DEFAULT 'synthetic' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`status` text NOT NULL,
	`entity_id` text,
	PRIMARY KEY(`workspace_id`, `id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `opportunities` (
	`workspace_id` text NOT NULL,
	`id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`source` text DEFAULT 'synthetic' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`account_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`stage_id` text NOT NULL,
	`name` text NOT NULL,
	`amount` integer NOT NULL,
	`close_date` text NOT NULL,
	`stage_entered_at` text NOT NULL,
	`next_action` text,
	`forecast_category` text NOT NULL,
	`competitor` text,
	`decision_criteria` text NOT NULL,
	`close_date_changes` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	PRIMARY KEY(`workspace_id`, `id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`account_id`) REFERENCES `accounts`(`workspace_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`workspace_id`,`owner_id`) REFERENCES `users`(`workspace_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`workspace_id`,`stage_id`) REFERENCES `stages`(`workspace_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "amount_positive" CHECK("opportunities"."amount" >= 0)
);
--> statement-breakpoint
CREATE INDEX `idx_opportunities_account` ON `opportunities` (`workspace_id`,`account_id`);--> statement-breakpoint
CREATE INDEX `idx_opportunities_owner_stage` ON `opportunities` (`workspace_id`,`owner_id`,`stage_id`);--> statement-breakpoint
CREATE TABLE `order_lines` (
	`workspace_id` text NOT NULL,
	`id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`source` text DEFAULT 'synthetic' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`order_id` text NOT NULL,
	`product_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price` integer NOT NULL,
	PRIMARY KEY(`workspace_id`, `id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`order_id`) REFERENCES `orders`(`workspace_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`workspace_id`,`product_id`) REFERENCES `products`(`workspace_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`workspace_id` text NOT NULL,
	`id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`source` text DEFAULT 'synthetic' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`account_id` text NOT NULL,
	`status` text NOT NULL,
	`ordered_at` text NOT NULL,
	PRIMARY KEY(`workspace_id`, `id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`account_id`) REFERENCES `accounts`(`workspace_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `products` (
	`workspace_id` text NOT NULL,
	`id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`source` text DEFAULT 'synthetic' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`name` text NOT NULL,
	`sku` text NOT NULL,
	`price` integer NOT NULL,
	PRIMARY KEY(`workspace_id`, `id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unique_sku` ON `products` (`workspace_id`,`sku`);--> statement-breakpoint
CREATE TABLE `quality_issues` (
	`workspace_id` text NOT NULL,
	`id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`source` text DEFAULT 'synthetic' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`account_id` text,
	`kind` text NOT NULL,
	`severity` text NOT NULL,
	`description` text NOT NULL,
	`remediation` text NOT NULL,
	`status` text NOT NULL,
	PRIMARY KEY(`workspace_id`, `id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `quote_lines` (
	`workspace_id` text NOT NULL,
	`id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`source` text DEFAULT 'synthetic' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`quote_id` text NOT NULL,
	`product_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price` integer NOT NULL,
	PRIMARY KEY(`workspace_id`, `id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`quote_id`) REFERENCES `quotes`(`workspace_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`workspace_id`,`product_id`) REFERENCES `products`(`workspace_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `quotes` (
	`workspace_id` text NOT NULL,
	`id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`source` text DEFAULT 'synthetic' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`opportunity_id` text NOT NULL,
	`status` text NOT NULL,
	`expires_at` text NOT NULL,
	PRIMARY KEY(`workspace_id`, `id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`opportunity_id`) REFERENCES `opportunities`(`workspace_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `recommendations` (
	`workspace_id` text NOT NULL,
	`id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`source` text DEFAULT 'synthetic' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`account_id` text NOT NULL,
	`opportunity_id` text,
	`agent` text NOT NULL,
	`title` text NOT NULL,
	`reason` text NOT NULL,
	`evidence` text NOT NULL,
	`priority` integer NOT NULL,
	`status` text NOT NULL,
	`snoozed_until` text,
	`outcome` text,
	PRIMARY KEY(`workspace_id`, `id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`account_id`) REFERENCES `accounts`(`workspace_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`workspace_id`,`opportunity_id`) REFERENCES `opportunities`(`workspace_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`user_id`) REFERENCES `users`(`workspace_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_expiry` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `stage_history` (
	`workspace_id` text NOT NULL,
	`id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`source` text DEFAULT 'synthetic' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`opportunity_id` text NOT NULL,
	`from_stage` text NOT NULL,
	`to_stage` text NOT NULL,
	`actor_id` text NOT NULL,
	`amount` integer NOT NULL,
	`old_probability` integer NOT NULL,
	`new_probability` integer NOT NULL,
	PRIMARY KEY(`workspace_id`, `id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`opportunity_id`) REFERENCES `opportunities`(`workspace_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_history_time` ON `stage_history` (`workspace_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `stages` (
	`workspace_id` text NOT NULL,
	`id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`source` text DEFAULT 'synthetic' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`name` text NOT NULL,
	`position` integer NOT NULL,
	`probability` integer NOT NULL,
	`is_closed` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`workspace_id`, `id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "stage_probability" CHECK("stages"."probability" BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE TABLE `stakeholders` (
	`workspace_id` text NOT NULL,
	`id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`source` text DEFAULT 'synthetic' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`opportunity_id` text NOT NULL,
	`contact_id` text NOT NULL,
	`role` text NOT NULL,
	PRIMARY KEY(`workspace_id`, `id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`opportunity_id`) REFERENCES `opportunities`(`workspace_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`workspace_id`,`contact_id`) REFERENCES `contacts`(`workspace_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unique_stakeholder` ON `stakeholders` (`workspace_id`,`opportunity_id`,`contact_id`);--> statement-breakpoint
CREATE TABLE `tags` (
	`workspace_id` text NOT NULL,
	`id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`source` text DEFAULT 'synthetic' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`name` text NOT NULL,
	PRIMARY KEY(`workspace_id`, `id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`workspace_id` text NOT NULL,
	`id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`source` text DEFAULT 'synthetic' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`account_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`due_date` text NOT NULL,
	`status` text NOT NULL,
	`recommendation_id` text,
	PRIMARY KEY(`workspace_id`, `id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`account_id`) REFERENCES `accounts`(`workspace_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`workspace_id`,`owner_id`) REFERENCES `users`(`workspace_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_task_recommendation` ON `tasks` (`workspace_id`,`recommendation_id`);--> statement-breakpoint
CREATE TABLE `teams` (
	`workspace_id` text NOT NULL,
	`id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`source` text DEFAULT 'synthetic' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`name` text NOT NULL,
	PRIMARY KEY(`workspace_id`, `id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `territories` (
	`workspace_id` text NOT NULL,
	`id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`source` text DEFAULT 'synthetic' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`name` text NOT NULL,
	PRIMARY KEY(`workspace_id`, `id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`workspace_id` text NOT NULL,
	`id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`source` text DEFAULT 'synthetic' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`team_id` text,
	PRIMARY KEY(`workspace_id`, `id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`team_id`) REFERENCES `teams`(`workspace_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `workflow_rules` (
	`workspace_id` text NOT NULL,
	`id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`source` text DEFAULT 'synthetic' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`name` text NOT NULL,
	`definition` text NOT NULL,
	`enabled` integer NOT NULL,
	PRIMARY KEY(`workspace_id`, `id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `workflow_runs` (
	`workspace_id` text NOT NULL,
	`id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`source` text DEFAULT 'synthetic' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`rule_id` text NOT NULL,
	`entity_id` text NOT NULL,
	`result` text NOT NULL,
	`status` text NOT NULL,
	PRIMARY KEY(`workspace_id`, `id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`rule_id`) REFERENCES `workflow_rules`(`workspace_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kind` text DEFAULT 'synthetic' NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL
);
