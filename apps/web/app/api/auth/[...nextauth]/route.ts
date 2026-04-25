/**
 * Purpose: Expose NextAuth (Auth.js v5) endpoint handlers under /api/auth/*.
 * Why important: Required by NextAuth to handle sign-in, callback, session, and CSRF flows.
 * Used by: Browser-side and server-side NextAuth client calls.
 */
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
