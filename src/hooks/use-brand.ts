import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const defaultLogoUrl = "/brand/bank-of-sydney-logo.png";
const defaultMarkUrl = "/brand/bank-of-sydney-mark.png";

export type PageKey = "home" | "login" | "dashboard";
export type PageColors = {
  background?: string;
  primary?: string;
  text?: string;
  card?: string;
  accent?: string;
};
export type ThemeOverrides = Partial<Record<PageKey, PageColors>>;

export type DashboardWidgetKey =
  | "balance"
  | "quickActions"
  | "cashFlow"
  | "savingsGoal"
  | "spendingBreakdown"
  | "exchangeRates"
  | "recentTransactions"
  | "accountInfo";

export type DashboardWidgets = Partial<Record<DashboardWidgetKey, boolean>>;

export const DASHBOARD_WIDGET_DEFAULTS: Record<DashboardWidgetKey, boolean> = {
  balance: true,
  quickActions: true,
  cashFlow: true,
  savingsGoal: true,
  spendingBreakdown: true,
  exchangeRates: true,
  recentTransactions: true,
  accountInfo: true,
};

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
  supportChatScript: string;
  themeOverrides: ThemeOverrides;
  dashboardWidgets: DashboardWidgets;
}

export const BRAND_DEFAULTS: BrandSettings = {
  bankName: "Bank of Sydney",
  tagline: "Banking, reimagined",
  supportEmail: "support@bankofsydney.com",
  supportPhone: "",
  address: "",
  logoUrl: defaultLogoUrl,
  markUrl: defaultMarkUrl,
  supportEnabled: false,
  supportWhatsapp: "",
  supportTelegram: "",
  supportChatUrl: "",
  supportMessage: "Hi! I need help with my account.",
  maintenanceMode: false,
  footerText: "© 2005 Bank of Sydney. All rights reserved.",
  supportChatScript: "",
  themeOverrides: {},
  dashboardWidgets: {},
};

export function useBrand(): BrandSettings {
  const { data } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async (): Promise<BrandSettings> => {
      const { data: { session } } = await supabase.auth.getSession();
      const publicCols = "bank_name, tagline, logo_data_url, mark_data_url, support_enabled, maintenance_mode, footer_text, theme_overrides, dashboard_widgets, support_chat_script";
      const fullCols = `${publicCols}, support_email, support_phone, address, support_whatsapp, support_telegram, support_chat_url, support_message`;
      const { data, error } = await supabase
        .from("app_settings")
        .select(session ? fullCols : publicCols)
        .eq("id", "singleton")
        .maybeSingle();
      if (error || !data) return BRAND_DEFAULTS;
      const row = data as unknown as Record<string, unknown>;
      const str = (k: string) => (typeof row[k] === "string" ? (row[k] as string) : "");
      const obj = (k: string) =>
        row[k] && typeof row[k] === "object" && !Array.isArray(row[k])
          ? (row[k] as Record<string, unknown>)
          : {};
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
        supportChatScript: str("support_chat_script"),
        themeOverrides: obj("theme_overrides") as ThemeOverrides,
        dashboardWidgets: obj("dashboard_widgets") as DashboardWidgets,
      };
    },
    staleTime: 60_000,
  });
  return data ?? BRAND_DEFAULTS;
}