import { createServerFn } from "@tanstack/react-start";

const ADMIN_CODE = "1975";

export const updateBrandSettings = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      code: string;
      bankName?: string;
      tagline?: string;
      supportEmail?: string;
      supportPhone?: string;
      address?: string;
      logoDataUrl?: string | null;
      markDataUrl?: string | null;
    }) => {
      if (!input || typeof input.code !== "string") throw new Error("Invalid request");
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
        code: input.code,
        bankName: str(input.bankName, 100),
        tagline: str(input.tagline, 200),
        supportEmail: str(input.supportEmail, 200),
        supportPhone: str(input.supportPhone, 50),
        address: str(input.address, 500),
        logoDataUrl: dataUrl(input.logoDataUrl),
        markDataUrl: dataUrl(input.markDataUrl),
      };
    },
  )
  .handler(async ({ data }) => {
    if (data.code !== ADMIN_CODE) throw new Error("Invalid access code");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = {};
    if (data.bankName !== undefined && data.bankName.length > 0) patch.bank_name = data.bankName;
    if (data.tagline !== undefined) patch.tagline = data.tagline;
    if (data.supportEmail !== undefined) patch.support_email = data.supportEmail;
    if (data.supportPhone !== undefined) patch.support_phone = data.supportPhone;
    if (data.address !== undefined) patch.address = data.address;
    if (data.logoDataUrl !== undefined) patch.logo_data_url = data.logoDataUrl;
    if (data.markDataUrl !== undefined) patch.mark_data_url = data.markDataUrl;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await supabaseAdmin
      .from("app_settings")
      .update(patch)
      .eq("id", "singleton");
    if (error) throw new Error(error.message);
    return { ok: true };
  });