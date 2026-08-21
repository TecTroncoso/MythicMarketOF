CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`rating` integer NOT NULL,
	`text` text NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
