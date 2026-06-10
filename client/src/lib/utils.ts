import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Pluralize an English noun. Handles the rules used by the geo labels
 * (Facility → Facilities, District → Districts, Province → Provinces).
 * Not a full inflector — adequate for tenant-configurable labels.
 */
export function pluralize(word: string): string {
  if (!word) return word
  const lower = word.toLowerCase()
  if (/[bcdfghjklmnpqrstvwxz]y$/.test(lower)) {
    return word.slice(0, -1) + "ies"
  }
  if (/(s|x|z|ch|sh)$/.test(lower)) {
    return word + "es"
  }
  return word + "s"
}
