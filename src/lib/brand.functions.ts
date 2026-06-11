import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const updateBrandSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      bankName?: string;
      tagline?: string;
      supportEmail?: string;
      supportPhone?: string;
      address?: string;
      logoDataUrl?: string | null;
      markDataUrl?: string | null;
      supportEnabled?: boolean;
      supportWhatsapp?: string;
      supportTelegram?: string;
      supportChatUrl?: string;
      supportMessage?: string;
      maintenanceMode?: boolean;
    }) => {
      if (!input) throw new Error("Invalid request");
      const str = (v: unknown, max: number) => {
        if (v === undefined) return undefined;
        const s = String(v ?? "").trim();
        if (s.length > max) throw new Error("Field too long");
        return s;
      };
      const dataUrl = (v: unknown): string | null | undefined => {
        if (v === undefined) return undefined;
        if (v === null || v === "") return null;
        const s = String(v);
        if (!s.startsWith("data:image/")) throw new Error("Invalid image data");
        if (s.length > 2_000_000) throw new Error("Image too large (max ~1.5MB)");
        return s;
      };
      return {
        bankName: str(input.bankName, 100),
        tagline: str(input.tagline, 200),
        supportEmail: str(input.supportEmail, 200),
        supportPhone: str(input.supportPhone, 50),
        address: str(input.address, 500),
        logoDataUrl: dataUrl(input.logoDataUrl),
        markDataUrl: dataUrl(input.markDataUrl),
        supportEnabled: typeof input.supportEnabled === "boolean" ? input.supportEnabled : undefined,
        supportWhatsapp: str(input.supportWhatsapp, 50),
        supportTelegram: str(input.supportTelegram, 100),
        supportChatUrl: str(input.supportChatUrl, 500),
        supportMessage: str(input.supportMessage, 300),
        maintenanceMode:
          typeof input.maintenanceMode === "boolean" ? input.maintenanceMode : undefined,
      };
    },
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: isAdmin, error: rErr } = await supabaseAdmin.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (rErr) throw new Error(rErr.message);
    if (!isAdmin) throw new Error("Forbidden: admin only");
    const patch: {
      bank_name?: string;
      tagline?: string;
      support_email?: string;
      support_phone?: string;
      address?: string;
      logo_data_url?: string | null;
      mark_data_url?: string | null;
      support_enabled?: boolean;
      support_whatsapp?: string;
      support_telegram?: string;
      support_chat_url?: string;
      support_message?: string;
      maintenance_mode?: boolean;
    } = {};
    if (data.bankName !== undefined && data.bankName.length > 0) patch.bank_name = data.bankName;
    if (data.tagline !== undefined) patch.tagline = data.tagline;
    if (data.supportEmail !== undefined) patch.support_email = data.supportEmail;
    if (data.supportPhone !== undefined) patch.support_phone = data.supportPhone;
    if (data.address !== undefined) patch.address = data.address;
    if (data.logoDataUrl !== undefined) patch.logo_data_url = data.logoDataUrl;
    if (data.markDataUrl !== undefined) patch.mark_data_url = data.markDataUrl;
    if (data.supportEnabled !== undefined) patch.support_enabled = data.supportEnabled;
    if (data.supportWhatsapp !== undefined) patch.support_whatsapp = data.supportWhatsapp;
    if (data.supportTelegram !== undefined) patch.support_telegram = data.supportTelegram;
    if (data.supportChatUrl !== undefined) patch.support_chat_url = data.supportChatUrl;
    if (data.supportMessage !== undefined) patch.support_message = data.supportMessage;
    if (data.maintenanceMode !== undefined) patch.maintenance_mode = data.maintenanceMode;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await supabaseAdmin
      .from("app_settings")
      .update(patch)
      .eq("id", "singleton");
    if (error) throw new Error(error.message);
    return { ok: true };
  });