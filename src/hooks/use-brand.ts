import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import defaultLogo from "@/assets/bank-of-sydney-logo.png.asset.json";
import defaultMark from "@/assets/bank-of-sydney-mark.png.asset.json";

export interface BrandSettings {
  bankName: string;
  tagline: string;
  supportEmail: string;
  supportPhone: string;
  address: string;
  logoUrl: string;
  markUrl: string;
  supportEnabled: boolean;
  supportWhatsapp: string;
  supportTelegram: string;
  supportChatUrl: string;
  supportMessage: string;
  maintenanceMode: boolean;
  footerText: string;
}

export const BRAND_DEFAULTS: BrandSettings = {
  bankName: "Bank of Sydney",
  tagline: "Banking, reimagined",
  supportEmail: "support@bankofsydney.com",
  supportPhone: "",
  address: "",
  logoUrl: defaultLogo.url,
  markUrl: defaultMark.url,
  supportEnabled: false,
  supportWhatsapp: "",
  supportTelegram: "",
  supportChatUrl: "",
  supportMessage: "Hi! I need help with my account.",
  maintenanceMode: false,
  footerText: "© 2005 Bank of Sydney. All rights reserved.",
};

export function useBrand(): BrandSettings {
  const { data } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async (): Promise<BrandSettings> => {
      const { data: { session } } = await supabase.auth.getSession();
      const publicCols = "bank_name, tagline, logo_data_url, mark_data_url, support_enabled, maintenance_mode, footer_text";
      const fullCols = `${publicCols}, support_email, support_phone, address, support_whatsapp, support_telegram, support_chat_url, support_message`;
      const { data, error } = await supabase
        .from("app_settings")
        .select(session ? fullCols : publicCols)
        .eq("id", "singleton")
        .maybeSingle();
      if (error || !data) return BRAND_DEFAULTS;
      const row = data as unknown as Record<string, unknown>;
      const str = (k: string) => (typeof row[k] === "string" ? (row[k] as string) : "");
      return {
        bankName: str("bank_name") || BRAND_DEFAULTS.bankName,
        tagline: str("tagline") || BRAND_DEFAULTS.tagline,
        supportEmail: str("support_email") || (session ? BRAND_DEFAULTS.supportEmail : ""),
        supportPhone: str("support_phone"),
        address: str("address"),
        logoUrl: str("logo_data_url") || BRAND_DEFAULTS.logoUrl,
        markUrl: str("mark_data_url") || BRAND_DEFAULTS.markUrl,
        supportEnabled: !!row.support_enabled,
        supportWhatsapp: str("support_whatsapp"),
        supportTelegram: str("support_telegram"),
        supportChatUrl: str("support_chat_url"),
        supportMessage: str("support_message") || BRAND_DEFAULTS.supportMessage,
        maintenanceMode: !!row.maintenance_mode,
        footerText: str("footer_text") || BRAND_DEFAULTS.footerText,
      };
    },
    staleTime: 60_000,
  });
  return data ?? BRAND_DEFAULTS;
}