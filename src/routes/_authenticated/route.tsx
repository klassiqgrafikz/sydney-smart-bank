import { createFileRoute, Outlet, redirect, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useProfile } from "@/hooks/use-profile";
import { useAvatarUrl } from "@/hooks/use-avatar-url";
import { NotificationsBell } from "@/components/notifications-bell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ensureProfile } from "@/lib/ensure-profile";
import { useBrand } from "@/hooks/use-brand";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth" });
    }
    await ensureProfile(data.user);
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { data: profile } = useProfile();
  const avatarUrl = useAvatarUrl(profile?.avatar_url);
  const initials = `${profile?.first_name?.[0] ?? ""}${profile?.last_name?.[0] ?? ""}`.toUpperCase() || "ST";
  const brand = useBrand();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/30">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger />
            <Link to="/dashboard" aria-label={brand.bankName} className="flex items-center gap-2">
              <img src={brand.logoUrl} alt={brand.bankName} className="h-9 w-auto md:h-10" />
            </Link>
            <div className="ml-auto flex items-center gap-3">
              {profile?.id ? <NotificationsBell userId={profile.id} /> : null}
              <Link to="/profile" aria-label="Profile" className="rounded-full ring-offset-background transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <Avatar className="h-8 w-8">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt="Profile picture" /> : null}
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
                </Avatar>
              </Link>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}