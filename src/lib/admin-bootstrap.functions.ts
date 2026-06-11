import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ADMIN_CODE = "1975";

/**
 * Bootstrap admin: if no admin exists in user_roles, the first authenticated
 * caller who provides the correct code becomes admin. Safe to call repeatedly;
 * once an admin exists, further calls are rejected.
 */
export const bootstrapAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string }) => {
    if (!input || typeof input.code !== "string") throw new Error("Invalid request");
    return { code: input.code };
  })
  .handler(async ({ data, context }) => {
    if (data.code !== ADMIN_CODE) throw new Error("Invalid access code");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count, error: cErr } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    if (cErr) throw new Error(cErr.message);
    if ((count ?? 0) > 0) {
      return { ok: false, reason: "An admin already exists" };
    }

    const { error: iErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (iErr) throw new Error(iErr.message);

    return { ok: true };
  });