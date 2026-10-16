import { supabase } from "../../lib/supabase";

export async function getUserIdAsync(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error("User not authenticated");
  }
  return user.id;
}

/**
 * Removes undefined properties from an object so Supabase insert/update calls don't send undefined.
 */
export function sanitizeForSupabase<T extends object>(obj: T): Partial<T> {
  const clean: Record<string, unknown> = {};
  const record = obj as Record<string, unknown>;
  Object.keys(record).forEach((key) => {
    if (record[key] !== undefined) {
      clean[key] = record[key];
    }
  });
  return clean as Partial<T>;
}
