/**
 * Compatibility shim. The previous custom Radix-based Toaster has been
 * replaced with sonner. New code should import `toast` from "sonner"
 * directly; this module re-exports both so older call sites continue to
 * work while we migrate.
 */
export { toast } from "sonner";
export { Toaster } from "./sonner";
