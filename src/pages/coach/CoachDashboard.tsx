import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Users, ChevronRight } from "lucide-react";

type Client = {
  id: string;
  name: string;
  email: string;
  created_at: string;
};

export default function CoachDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("coach_id", user.id)
      .eq("role", "client")
      .then(({ data }) => setClients((data as Client[]) || []));
  }, [user]);

  return (
    <div className="min-h-screen pb-24">
      <div className="bg-gradient-to-br from-primary/20 to-accent/5 px-5 pb-8 pt-12">
        <div className="flex items-center gap-3 mb-1">
          <Users className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Coach Dashboard</h1>
        </div>
        <p className="text-muted-foreground text-sm">{clients.length} clients</p>
      </div>

      <div className="px-5 -mt-4 space-y-3">
        {clients.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">
            No clients yet. Create client accounts to get started.
          </p>
        )}
        {clients.map((c) => (
          <button
            key={c.id}
            onClick={() => navigate(`/coach/client/${c.id}`)}
            className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-4 text-left transition-all active:scale-[0.98]"
          >
            <div>
              <p className="text-sm font-semibold">{c.name || c.email}</p>
              <p className="text-xs text-muted-foreground">{c.email}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
}
