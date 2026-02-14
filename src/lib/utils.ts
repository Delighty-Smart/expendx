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
