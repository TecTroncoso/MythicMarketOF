CREATE TABLE `pricing_settings` (
	`game` text PRIMARY KEY NOT NULL,
	`markupUsd` real DEFAULT 0.05 NOT NULL,
	`markupEur` real DEFAULT 0.05 NOT NULL,
	`updatedAt` integer NOT NULL,
	`updatedBy` text
);
