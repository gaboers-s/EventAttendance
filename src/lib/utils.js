import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Optional: remove if not using iframe embedding
export const isIframe = window.self !== window.top;