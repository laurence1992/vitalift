import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings as SettingsIcon, LogOut, Pencil, Check, KeyRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  const handleEditStart = () => {
    setName(profile?.name || "");
    setEditing(true);
  };

  const handleSaveName = async () => {
    if (!user || !name.trim()) return;
    setSaving(true);
    await supabase.from("profiles").update({ name: name.trim() }).eq("id", user.id);
    setSaving(false);
    setEditing(false);
    toast({ title: "Name updated" });
    // Refresh profile in auth context
    window.location.reload();
  };

  const handleChangePassword = async () => {
    if (!profile?.email) return;
    setSendingReset(true);
    await supabase.auth.resetPasswordForEmail(profile.email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    setSendingReset(false);
    toast({ title: "Password reset email sent", description: "Check your inbox for a reset link." });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-background px-5 pb-6 pt-12">
        <div className="flex items-center gap-3 mb-1">
          <SettingsIcon className="h-7 w-7 text-primary" />
          <h1 className="text-xl font-bold tracking-tight text-foreground">Settings</h1>
        </div>
      </div>

      <div className="px-5 space-y-4">
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <p className="text-xs text-muted-foreground">{profile?.email}</p>
          <p className="text-xs text-muted-foreground capitalize">Role: {profile?.role}</p>

          {editing ? (
            <div className="flex gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="h-9"
                autoFocus
              />
              <Button size="sm" onClick={handleSaveName} disabled={saving || !name.trim()}>
                <Check className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">{profile?.name || "No name"}</p>
              <Button size="sm" variant="ghost" onClick={handleEditStart}>
                <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
            </div>
          )}
        </div>

        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={handleChangePassword}
          disabled={sendingReset}
        >
          <KeyRound className="h-4 w-4" />
          {sendingReset ? "Sending..." : "Change Password"}
        </Button>

        <Button variant="destructive" className="w-full gap-2" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
