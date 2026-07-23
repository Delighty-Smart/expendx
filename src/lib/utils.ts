import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export function normalizeDate(dateStr: string | undefined): string | undefined {
  if (!dateStr) return undefined;
  // If it's an ISO string (contains T), extract the date part
  if (dateStr.includes('T')) {
    return dateStr.split('T')[0];
  }
  return dateStr;
}

export const FULFILLMENT_EMOJIS: Record<string, string> = {
  "1": "💔",
  "2": "😐",
  "3": "😊",
  "4": "💖",
  "5": "🌟"
};

export function formatFulfillmentDescription(desc: string | null | undefined): string {
  if (!desc) return "";
  return desc.replace(/\[Fulfillment:\s*([1-5])\]/gi, (_, rating) => {
    return FULFILLMENT_EMOJIS[rating] || "";
  }).trim();
}
