import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MessageSquare } from "lucide-react";

type ConvoWithProfile = {
  id: string;
  coach_id: string;
  client_id: string;
  other_name: string;
  other_email: string;
  last_message?: string;
  unread: number;
};

export default function Inbox() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [convos, setConvos] = useState<ConvoWithProfile[]>([]);

  useEffect(() => {
    if (!user || !profile) return;

    const load = async () => {
      const { data: rawConvos } = await supabase
        .from("conversations")
        .select("*")
        .or(`coach_id.eq.${user.id},client_id.eq.${user.id}`);

      if (!rawConvos) return;

      const enriched: ConvoWithProfile[] = [];
      for (const c of rawConvos) {
        const otherId = c.coach_id === user.id ? c.client_id : c.coach_id;
        const { data: otherProfile } = await supabase
          .from("profiles")
          .select("name, email")
          .eq("id", otherId)
          .maybeSingle();

        const { data: lastMsg } = await supabase
          .from("messages")
          .select("body, media_type")
          .eq("conversation_id", c.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const { count: unread } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", c.id)
          .neq("sender_user_id", user.id)
          .is("read_at", null);

        enriched.push({
          id: c.id,
          coach_id: c.coach_id,
          client_id: c.client_id,
          other_name: otherProfile?.name || otherProfile?.email || "Unknown",
          other_email: otherProfile?.email || "",
          last_message: lastMsg?.media_type !== "text" ? `📎 ${lastMsg?.media_type}` : (lastMsg?.body || ""),
          unread: unread ?? 0,
        });
      }
      setConvos(enriched);
    };
    load();
  }, [user, profile]);

  return (
    <div className="min-h-screen pb-24">
      <div className="bg-gradient-to-br from-primary/20 to-accent/5 px-5 pb-8 pt-12">
        <div className="flex items-center gap-3 mb-1">
          <MessageSquare className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Inbox</h1>
        </div>
      </div>

      <div className="px-5 -mt-4 space-y-2">
        {convos.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">No conversations yet.</p>
        )}
        {convos.map((c) => (
          <button
            key={c.id}
            onClick={() => navigate(`/inbox/${c.id}`)}
            className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-4 text-left transition-all active:scale-[0.98]"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold truncate">{c.other_name}</p>
                {c.unread > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                    {c.unread}
                  </span>
                )}
              </div>
              {c.last_message && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">{c.last_message}</p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
