CREATE TABLE `notification_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`monitor_id` text NOT NULL,
	`event` text NOT NULL,
	`success` integer NOT NULL,
	`error` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`channel_id`) REFERENCES `notification_channels`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`monitor_id`) REFERENCES `monitors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notification_logs_channel_id_idx` ON `notification_logs` (`channel_id`);--> statement-breakpoint
CREATE INDEX `notification_logs_monitor_id_idx` ON `notification_logs` (`monitor_id`);--> statement-breakpoint
CREATE INDEX `notification_logs_created_at_idx` ON `notification_logs` (`created_at`);
