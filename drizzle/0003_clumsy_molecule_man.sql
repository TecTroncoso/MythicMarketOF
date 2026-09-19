CREATE TABLE `supplier_price_rows` (
	`id` text PRIMARY KEY NOT NULL,
	`snapshotId` text NOT NULL,
	`packageName` text NOT NULL,
	`position` integer NOT NULL,
	`catalogBrlCents` integer,
	`checkoutBrlCents` integer,
	`cashbackBrlCents` integer,
	`catalogUsdCents` integer,
	`checkoutUsdCents` integer,
	`cashbackUsdCents` integer,
	`catalogEurCents` integer,
	`checkoutEurCents` integer,
	`cashbackEurCents` integer,
	`cashbackPercent` real,
	FOREIGN KEY (`snapshotId`) REFERENCES `supplier_price_snapshots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `supplier_price_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`scrapedAt` integer NOT NULL,
	`importedAt` integer NOT NULL,
	`source` text DEFAULT 'eneba' NOT NULL,
	`provider` text,
	`region` text,
	`currencies` text NOT NULL,
	`totalPackages` integer NOT NULL
);
