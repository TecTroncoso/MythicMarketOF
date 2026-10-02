CREATE INDEX `orders_user_created_idx` ON `orders` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `orders_created_idx` ON `orders` (`createdAt`);--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`status`);--> statement-breakpoint
CREATE INDEX `orders_product_idx` ON `orders` (`productId`);--> statement-breakpoint
CREATE INDEX `orders_mlbb_user_idx` ON `orders` (`mlbbUserId`);--> statement-breakpoint
CREATE INDEX `store_combos_game_idx` ON `store_combos` (`game`);--> statement-breakpoint
CREATE INDEX `supplier_price_rows_snapshot_position_idx` ON `supplier_price_rows` (`snapshotId`,`position`);--> statement-breakpoint
CREATE INDEX `supplier_price_snapshots_game_scraped_idx` ON `supplier_price_snapshots` (`game`,`scrapedAt`);