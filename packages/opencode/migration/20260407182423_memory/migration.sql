CREATE TABLE `memory_catalog` (
	`id` text PRIMARY KEY,
	`project_id` text NOT NULL,
	`wing` text NOT NULL,
	`room` text NOT NULL,
	`hall` text NOT NULL,
	`content` text NOT NULL,
	`compressed` text,
	`tags` text NOT NULL,
	`session_id` text,
	`time_created` integer NOT NULL,
	`time_updated` integer NOT NULL,
	CONSTRAINT `fk_memory_catalog_project_id_project_id_fk` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `memory_eidetic` (
	`id` text PRIMARY KEY,
	`project_id` text NOT NULL,
	`content` text NOT NULL,
	`summary` text NOT NULL,
	`tags` text NOT NULL,
	`relevance` real DEFAULT 1 NOT NULL,
	`time_decay` integer NOT NULL,
	`session_id` text,
	`time_created` integer NOT NULL,
	`time_updated` integer NOT NULL,
	CONSTRAINT `fk_memory_eidetic_project_id_project_id_fk` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `memory_rule` (
	`id` text PRIMARY KEY,
	`project_id` text NOT NULL,
	`content` text NOT NULL,
	`tag` text,
	`position` integer DEFAULT 0 NOT NULL,
	`time_created` integer NOT NULL,
	`time_updated` integer NOT NULL,
	CONSTRAINT `fk_memory_rule_project_id_project_id_fk` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `memory_catalog_project_idx` ON `memory_catalog` (`project_id`);--> statement-breakpoint
CREATE INDEX `memory_catalog_wing_idx` ON `memory_catalog` (`wing`);--> statement-breakpoint
CREATE INDEX `memory_catalog_room_idx` ON `memory_catalog` (`room`);--> statement-breakpoint
CREATE INDEX `memory_catalog_hall_idx` ON `memory_catalog` (`hall`);--> statement-breakpoint
CREATE INDEX `memory_eidetic_project_idx` ON `memory_eidetic` (`project_id`);--> statement-breakpoint
CREATE INDEX `memory_eidetic_decay_idx` ON `memory_eidetic` (`time_decay`);--> statement-breakpoint
CREATE INDEX `memory_rule_project_idx` ON `memory_rule` (`project_id`);