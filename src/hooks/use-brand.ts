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
};

export function useBrand(): BrandSettings {
  const { data } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async (): Promise<BrandSettings> => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("bank_name, tagline, support_email, support_phone, address, logo_data_url, mark_data_url, support_enabled, support_whatsapp, support_telegram, support_chat_url, support_message")
        .eq("id", "singleton")
        .maybeSingle();
      if (error || !data) return BRAND_DEFAULTS;
      return {
        bankName: data.bank_name || BRAND_DEFAULTS.bankName,
        tagline: data.tagline || BRAND_DEFAULTS.tagline,
        supportEmail: data.support_email || BRAND_DEFAULTS.supportEmail,
        supportPhone: data.support_phone || "",
        address: data.address || "",
        logoUrl: data.logo_data_url || BRAND_DEFAULTS.logoUrl,
        markUrl: data.mark_data_url || BRAND_DEFAULTS.markUrl,
        supportEnabled: !!data.support_enabled,
        supportWhatsapp: data.support_whatsapp || "",
        supportTelegram: data.support_telegram || "",
        supportChatUrl: data.support_chat_url || "",
        supportMessage: data.support_message || BRAND_DEFAULTS.supportMessage,
      };
    },
    staleTime: 60_000,
  });
  return data ?? BRAND_DEFAULTS;
}