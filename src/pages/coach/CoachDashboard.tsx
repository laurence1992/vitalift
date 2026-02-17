import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Users, ChevronRight, MessageSquare, Archive, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

type Client = {
  id: string;
  name: string;
  email: string;
  created_at: string;
  status: string;
};

export default function CoachDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<Client | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<Client | null>(null);

  const fetchClients = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("coach_id", user.id)
      .eq("role", "client")
      .eq("status", showArchived ? "archived" : "active");
    setClients((data as Client[]) || []);
  };

  // Orphan reconciliation: assign any client with null coach_id to this coach
  const reconcileOrphans = async () => {
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ coach_id: user.id } as any)
      .eq("role", "client")
      .is("coach_id", null);
  };

  useEffect(() => {
    if (!user) return;
    reconcileOrphans().then(() => fetchClients());
  }, [user, showArchived]);

  const handleArchive = async () => {
    if (!archiveTarget) return;
    await supabase
      .from("profiles")
      .update({ status: "archived", archived_at: new Date().toISOString() } as any)
      .eq("id", archiveTarget.id);
    toast({ title: "Client archived" });
    setArchiveTarget(null);
    fetchClients();
  };

  const handleRestore = async () => {
    if (!restoreTarget) return;
    await supabase
      .from("profiles")
      .update({ status: "active", archived_at: null } as any)
      .eq("id", restoreTarget.id);
    toast({ title: "Client restored" });
    setRestoreTarget(null);
    fetchClients();
  };

  const handleMessage = async (clientId: string) => {
    if (!user) return;
    // Find or create conversation
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("coach_id", user.id)
      .eq("client_id", clientId)
      .maybeSingle();

    if (existing) {
      navigate(`/conversation/${existing.id}`);
    } else {
      const { data: created } = await supabase
        .from("conversations")
        .insert({ coach_id: user.id, client_id: clientId })
        .select("id")
        .single();
      if (created) navigate(`/conversation/${created.id}`);
    }
  };

  return (
    <div className="min-h-screen pb-24">
      <div className="bg-gradient-to-br from-primary/20 to-accent/5 px-5 pb-8 pt-12">
        <div className="flex items-center gap-3 mb-1">
          <Users className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Coach Dashboard</h1>
        </div>
        <p className="text-muted-foreground text-sm">{clients.length} {showArchived ? "archived" : "active"} clients</p>
      </div>

      {/* Filter toggle */}
      <div className="px-5 pt-4 pb-2 flex gap-2">
        <Button
          size="sm"
          variant={!showArchived ? "default" : "outline"}
          onClick={() => setShowArchived(false)}
        >
          Active
        </Button>
        <Button
          size="sm"
          variant={showArchived ? "default" : "outline"}
          onClick={() => setShowArchived(true)}
        >
          <Archive className="h-3.5 w-3.5 mr-1" />
          Archived
        </Button>
      </div>

      <div className="px-5 space-y-3">
        {clients.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">
            {showArchived ? "No archived clients." : "No clients yet. New signups will appear here automatically."}
          </p>
        )}
        {clients.map((c) => (
          <div
            key={c.id}
            className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-4"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{c.name || c.email}</p>
              <p className="text-xs text-muted-foreground truncate">{c.email}</p>
            </div>
            <div className="flex items-center gap-1.5 ml-2 shrink-0">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => navigate(`/coach/client/${c.id}`)}
                title="View Profile"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => handleMessage(c.id)}
                title="Message"
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
              {showArchived ? (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-green-500"
                  onClick={() => setRestoreTarget(c)}
                  title="Restore"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive"
                  onClick={() => setArchiveTarget(c)}
                  title="Archive Client"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Archive confirm dialog */}
      <AlertDialog open={!!archiveTarget} onOpenChange={() => setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive client?</AlertDialogTitle>
            <AlertDialogDescription>
              {archiveTarget?.name || archiveTarget?.email} will be removed from your active list. Their workouts, messages, and progress data will remain intact. You can restore them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore confirm dialog */}
      <AlertDialog open={!!restoreTarget} onOpenChange={() => setRestoreTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore client?</AlertDialogTitle>
            <AlertDialogDescription>
              {restoreTarget?.name || restoreTarget?.email} will be moved back to your active clients list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore}>Restore</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
