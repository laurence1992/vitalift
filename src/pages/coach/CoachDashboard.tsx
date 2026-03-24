import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Users, ChevronRight, MessageSquare, Archive, RotateCcw, Trash2 } from "lucide-react";
import { ClientListSkeleton } from "@/components/Skeletons";
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

const CACHE_KEY = "vitalift_coach_clients";
const CACHE_TTL = 60_000;

export default function CoachDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<Client | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<Client | null>(null);

  const cacheKey = (archived: boolean) => `${CACHE_KEY}_${archived ? "archived" : "active"}`;

  const readCache = (archived: boolean): Client[] | null => {
    try {
      const raw = sessionStorage.getItem(cacheKey(archived));
      if (!raw) return null;
      const { ts, data } = JSON.parse(raw);
      if (Date.now() - ts > CACHE_TTL) return null;
      return data;
    } catch { return null; }
  };

  const writeCache = (archived: boolean, data: Client[]) => {
    try { sessionStorage.setItem(cacheKey(archived), JSON.stringify({ ts: Date.now(), data })); }
    catch { /* storage full */ }
  };

  const invalidateCache = () => {
    try {
      sessionStorage.removeItem(cacheKey(true));
      sessionStorage.removeItem(cacheKey(false));
    } catch { /* noop */ }
  };

  const fetchClients = async () => {
    if (!user) return;
    const targetStatus = showArchived ? "archived" : "active";
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("coach_id", user.id)
      .eq("role", "client")
      .eq("status", targetStatus);
    const result = (data as Client[]) || [];
    setClients(result);
    writeCache(showArchived, result);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;

    // Show cached data immediately
    const cached = readCache(showArchived);
    if (cached) {
      setClients(cached);
      setLoading(false);
    }

    // Fire-and-forget reconcile, fetch concurrently
    supabase.rpc("reconcile_orphan_clients", { _coach_id: user.id }).then(() => {});
    fetchClients();
  }, [user, showArchived]);

  const handleArchive = async () => {
    if (!archiveTarget) return;
    await supabase
      .from("profiles")
      .update({ status: "archived", archived_at: new Date().toISOString() } as any)
      .eq("id", archiveTarget.id);
    invalidateCache();
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
    invalidateCache();
    toast({ title: "Client restored" });
    setRestoreTarget(null);
    fetchClients();
  };

  const handleMessage = async (clientId: string) => {
    if (!user) return;
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("coach_id", user.id)
      .eq("client_id", clientId)
      .maybeSingle();

    if (existing) {
      navigate(`/inbox/${existing.id}`);
    } else {
      const { data: created } = await supabase
        .from("conversations")
        .insert({ coach_id: user.id, client_id: clientId })
        .select("id")
        .single();
      if (created) navigate(`/inbox/${created.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-background px-5 pb-6 pt-12">
        <div className="flex items-center gap-3 mb-1">
          <Users className="h-7 w-7 text-primary" />
          <h1 className="text-xl font-bold tracking-tight text-foreground">Coach Dashboard</h1>
        </div>
        <p className="text-muted-foreground text-xs">{clients.length} {showArchived ? "archived" : "active"} clients</p>
      </div>

      <div className="px-5 pt-2 pb-4 flex gap-2">
        <Button
          size="sm"
          variant={!showArchived ? "default" : "ghost"}
          onClick={() => setShowArchived(false)}
        >
          Active
        </Button>
        <Button
          size="sm"
          variant={showArchived ? "default" : "ghost"}
          onClick={() => setShowArchived(true)}
        >
          <Archive className="h-3.5 w-3.5 mr-1" />
          Archived
        </Button>
      </div>

      <div className="px-5 space-y-4">
        {loading ? (
          <ClientListSkeleton />
        ) : clients.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">
            {showArchived ? "No archived clients." : "No clients yet. New signups will appear here automatically."}
          </p>
        ) : clients.map((c) => {
          const displayName = c.name && c.name.trim() ? c.name : "Unnamed Client";
          const initials = displayName.split(" ").map(w => w[0]?.toUpperCase() || "").join("").slice(0, 2);
          return (
            <button
              key={c.id}
              onClick={() => navigate(`/coach/client/${c.id}`)}
              className="flex w-full items-center gap-3 rounded-2xl border border-border/40 bg-card px-4 py-5 text-left transition-all hover:border-primary hover:bg-primary/5 active:scale-[0.98]"
            >
              <div className="h-10 w-10 shrink-0 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">{initials}</span>
              </div>
              <div className="flex-1 min-w-0 flex flex-col">
                <p className="text-sm font-semibold truncate text-foreground capitalize">{displayName}</p>
                <p className="text-xs text-muted-foreground">{showArchived ? "Archived client" : "Active client"}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={(e) => { e.stopPropagation(); handleMessage(c.id); }}
                  title="Message"
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
                {showArchived ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={(e) => { e.stopPropagation(); setRestoreTarget(c); }}
                    title="Restore"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={(e) => { e.stopPropagation(); setArchiveTarget(c); }}
                    title="Archive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>
          );
        })}
      </div>

      <AlertDialog open={!!archiveTarget} onOpenChange={() => setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive client?</AlertDialogTitle>
            <AlertDialogDescription>
              {archiveTarget?.name || archiveTarget?.email} will be removed from your active list. You can restore them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive}>
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
