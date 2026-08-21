ALTER TABLE `orders` ADD `paymentMethod` text DEFAULT 'paypal' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `paymentDetail` text;