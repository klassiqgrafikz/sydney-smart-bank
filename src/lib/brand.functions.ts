import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PAGE_KEYS = ["home", "login", "dashboard"] as const;
const COLOR_KEYS = ["background", "primary", "text", "card", "accent"] as const;
const WIDGET_KEYS = [
  "balance", "quickActions", "cashFlow", "savingsGoal",
  "spendingBreakdown", "exchangeRates", "recentTransactions", "accountInfo",
] as const;

function sanitizeColor(v: unknown): string | undefined {
  if (v === undefined || v === null || v === "") return "";
  const s = String(v).trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(s)) throw new Error("Invalid color (must be #rrggbb)");
  return s;
}
function sanitizeThemeOverrides(input: unknown): Record<string, Record<string, string>> | undefined {
  if (input === undefined) return undefined;
  if (input === null || typeof input !== "object") throw new Error("Invalid theme");
  const out: Record<string, Record<string, string>> = {};
  for (const pk of PAGE_KEYS) {
    const page = (input as Record<string, unknown>)[pk];
    if (!page || typeof page !== "object") continue;
    const pageOut: Record<string, string> = {};
    for (const ck of COLOR_KEYS) {
      const v = (page as Record<string, unknown>)[ck];
      if (v === undefined) continue;
      const cleaned = sanitizeColor(v);
      if (cleaned !== undefined) pageOut[ck] = cleaned;
    }
    out[pk] = pageOut;
  }
  return out;
}
function sanitizeWidgets(input: unknown): Record<string, boolean> | undefined {
  if (input === undefined) return undefined;
  if (input === null || typeof input !== "object") throw new Error("Invalid widgets");
  const out: Record<string, boolean> = {};
  for (const k of WIDGET_KEYS) {
    const v = (input as Record<string, unknown>)[k];
    if (typeof v === "boolean") out[k] = v;
  }
  return out;
}

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
      footerText?: string;
      supportChatScript?: string;
      themeOverrides?: unknown;
      dashboardWidgets?: unknown;
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
        footerText: str(input.footerText, 300),
        supportChatScript:
          input.supportChatScript === undefined
            ? undefined
            : (() => {
                const s = String(input.supportChatScript ?? "");
                if (s.length > 10_000) throw new Error("Chat script too long (max 10KB)");
                return s;
              })(),
        themeOverrides: sanitizeThemeOverrides(input.themeOverrides),
        dashboardWidgets: sanitizeWidgets(input.dashboardWidgets),
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
      footer_text?: string;
      support_chat_script?: string;
      theme_overrides?: Record<string, Record<string, string>>;
      dashboard_widgets?: Record<string, boolean>;
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
    if (data.footerText !== undefined) patch.footer_text = data.footerText;
    if (data.supportChatScript !== undefined) patch.support_chat_script = data.supportChatScript;
    if (data.themeOverrides !== undefined) patch.theme_overrides = data.themeOverrides;
    if (data.dashboardWidgets !== undefined) patch.dashboard_widgets = data.dashboardWidgets;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await supabaseAdmin
      .from("app_settings")
      .update(patch)
      .eq("id", "singleton");
    if (error) throw new Error(error.message);
    return { ok: true };
  });