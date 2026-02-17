import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useUnreadCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const fetchCount = async () => {
    if (!user) return;
    // Get conversations where user is participant
    const { data: convos } = await supabase
      .from("conversations")
      .select("id")
      .or(`coach_id.eq.${user.id},client_id.eq.${user.id}`);

    if (!convos || convos.length === 0) { setCount(0); return; }

    const convoIds = convos.map((c) => c.id);
    const { count: unread } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .in("conversation_id", convoIds)
      .neq("sender_user_id", user.id)
      .is("read_at", null);

    setCount(unread ?? 0);
  };

  useEffect(() => {
    fetchCount();

    const channel = supabase
      .channel("unread-messages")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        fetchCount();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return count;
}
