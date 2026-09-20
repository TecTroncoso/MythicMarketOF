CREATE TABLE `item_markups` (
	`id` text PRIMARY KEY NOT NULL,
	`game` text NOT NULL,
	`itemKey` text NOT NULL,
	`markupUsd` real NOT NULL,
	`markupEur` real NOT NULL,
	`updatedAt` integer NOT NULL,
	`updatedBy` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `item_markups_game_item_key` ON `item_markups` (`game`,`itemKey`);