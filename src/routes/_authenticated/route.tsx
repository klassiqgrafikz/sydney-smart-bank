import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useProfile } from "@/hooks/use-profile";
import { useAvatarUrl } from "@/hooks/use-avatar-url";
import { NotificationsBell } from "@/components/notifications-bell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ensureProfile } from "@/lib/ensure-profile";
import { useBrand } from "@/hooks/use-brand";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, User as UserIcon, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { deleteOwnAccount } from "@/lib/account.functions";

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
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deleteFn = useServerFn(deleteOwnAccount);

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase.rpc("has_role", {
        _user_id: profile!.id,
        _role: "admin",
      });
      return !!data;
    },
    staleTime: 60_000,
  });

  const maintenanceActive = !!brand.maintenanceMode && !isAdmin;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteFn({});
      await supabase.auth.signOut();
      toast.success("Your account has been deleted");
      navigate({ to: "/auth" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete account");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

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
              <DropdownMenu>
                <DropdownMenuTrigger aria-label="Account menu" className="rounded-full ring-offset-background transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <Avatar className="h-8 w-8">
                    {avatarUrl ? <AvatarImage src={avatarUrl} alt="Profile picture" /> : null}
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{profile?.first_name} {profile?.last_name}</span>
                      <span className="truncate text-xs text-muted-foreground">{profile?.email}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile"><UserIcon className="mr-2 h-4 w-4" /> Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" /> Sign out
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={(e) => { e.preventDefault(); setConfirmDelete(true); }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete account
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6">
            {maintenanceActive ? (
              <div className="mx-auto flex min-h-[70vh] max-w-xl items-center">
                <Card className="w-full text-center">
                  <CardHeader>
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                      <Wrench className="h-7 w-7 text-primary" />
                    </div>
                    <CardTitle className="mt-3 text-2xl">Site is Under Development</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                      Please check back later.
                      <br />
                      <span className="mt-2 inline-block font-medium text-foreground">THANK YOU!</span>
                    </p>
                    <Button variant="outline" onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" /> Sign out
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Outlet />
            )}
          </main>
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes your profile, balance, and all of your transactions and transfers. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Yes, delete my account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}