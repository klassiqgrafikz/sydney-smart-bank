import { useBrand, type PageKey } from "@/hooks/use-brand";

/**
 * Applies admin-configured per-page color overrides by injecting CSS variables
 * scoped to a wrapper div. Children inherit the overrides via CSS cascade.
 * Colors are #rrggbb strings supplied by the admin portal.
 */
export function PageTheme({
  page,
  className,
  children,
}: {
  page: PageKey;
  className?: string;
  children: React.ReactNode;
}) {
  const { themeOverrides } = useBrand();
  const colors = themeOverrides?.[page] ?? {};
  const style: React.CSSProperties = {};
  if (colors.background) {
    (style as Record<string, string>)["--background"] = colors.background;
  }
  if (colors.text) {
    (style as Record<string, string>)["--foreground"] = colors.text;
    (style as Record<string, string>)["--card-foreground"] = colors.text;
  }
  if (colors.card) {
    (style as Record<string, string>)["--card"] = colors.card;
    (style as Record<string, string>)["--popover"] = colors.card;
  }
  if (colors.primary) {
    (style as Record<string, string>)["--primary"] = colors.primary;
    (style as Record<string, string>)["--ring"] = colors.primary;
    (style as Record<string, string>)["--sidebar-primary"] = colors.primary;
  }
  if (colors.accent) {
    (style as Record<string, string>)["--accent"] = colors.accent;
  }
  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}