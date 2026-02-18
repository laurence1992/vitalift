import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Settings() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-gradient-to-br from-primary/20 to-accent/5 px-5 pb-8 pt-12">
        <div className="flex items-center gap-3 mb-1">
          <SettingsIcon className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
        </div>
      </div>

      <div className="px-5 -mt-4 space-y-4">
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <p className="text-sm font-medium text-foreground">{profile?.name || "No name"}</p>
          <p className="text-xs text-muted-foreground">{profile?.email}</p>
          <p className="text-xs text-muted-foreground capitalize">Signed in as: {profile?.email} ({profile?.role})</p>
        </div>

        <Button variant="destructive" className="w-full gap-2" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
