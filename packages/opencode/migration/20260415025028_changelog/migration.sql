CREATE TABLE `changelog` (
	`session_id` text NOT NULL,
	`position` integer NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`time_created` integer NOT NULL,
	`time_updated` integer NOT NULL,
	CONSTRAINT `changelog_pk` PRIMARY KEY(`session_id`, `position`),
	CONSTRAINT `fk_changelog_session_id_session_id_fk` FOREIGN KEY (`session_id`) REFERENCES `session`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `changelog_session_idx` ON `changelog` (`session_id`);