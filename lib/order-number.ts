import { randomInt } from "node:crypto";

// Server-only module: node:crypto must never reach the client bundle, so
// order-number generation stays out of lib/orders.ts (which client components
// import for formatAmount / ORDER_STATUS_LABELS).
//
// No ambiguous characters (no I, O, 0, 1) so order numbers are easy to
// read aloud and type from a screenshot or receipt.
const ORDER_NUMBER_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ORDER_NUMBER_SUFFIX_LENGTH = 8;

export function generateOrderNumber(): string {
  let suffix = "";
  for (let i = 0; i < ORDER_NUMBER_SUFFIX_LENGTH; i++) {
    suffix += ORDER_NUMBER_ALPHABET[randomInt(ORDER_NUMBER_ALPHABET.length)];
  }
  return `MM-${suffix}`;
}
