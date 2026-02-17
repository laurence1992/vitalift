import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Send, Image, Video } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

type Message = {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  body: string | null;
  media_url: string | null;
  media_type: string;
  created_at: string;
  read_at: string | null;
};

export default function Conversation() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [otherName, setOtherName] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  useEffect(() => {
    if (!conversationId || !user) return;

    // Load conversation partner name
    supabase.from("conversations").select("*").eq("id", conversationId).maybeSingle()
      .then(async ({ data: convo }) => {
        if (!convo) return;
        const otherId = convo.coach_id === user.id ? convo.client_id : convo.coach_id;
        const { data: p } = await supabase.from("profiles").select("name, email").eq("id", otherId).maybeSingle();
        setOtherName(p?.name || p?.email || "Chat");
      });

    // Load messages
    const loadMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      setMessages((data as Message[]) || []);

      // Mark as read
      await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .neq("sender_user_id", user.id)
        .is("read_at", null);
    };
    loadMessages();

    const channel = supabase
      .channel(`convo-${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages((prev) => [...prev, newMsg]);
        // Auto-mark read if not sender
        if (newMsg.sender_user_id !== user.id) {
          supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("id", newMsg.id);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendText = async () => {
    if (!text.trim() || !user || !conversationId) return;
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_user_id: user.id,
      body: text.trim(),
      media_type: "text",
    });
    setText("");
  };

  const uploadMedia = async (file: File, type: "image" | "video") => {
    if (!user || !conversationId) return;
    const maxSize = type === "image" ? 5 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`File too large. Max ${type === "image" ? "5MB" : "50MB"}.`);
      return;
    }
    setUploading(true);
    const path = `${user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("media").upload(path, file);
    if (error) { alert("Upload failed"); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(path);
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_user_id: user.id,
      media_url: publicUrl,
      media_type: type,
    });
    setUploading(false);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-background/95 backdrop-blur-md px-4 py-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-bold">{otherName}</h1>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => {
          const isMine = msg.sender_user_id === user?.id;
          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-xl px-3 py-2 ${isMine ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
                {msg.media_type === "image" && msg.media_url && (
                  <img
                    src={msg.media_url}
                    alt="Photo"
                    className="rounded-lg max-h-[200px] cursor-pointer"
                    onClick={() => setEnlargedImage(msg.media_url)}
                  />
                )}
                {msg.media_type === "video" && msg.media_url && (
                  <video src={msg.media_url} controls className="rounded-lg max-h-[200px]" />
                )}
                {msg.body && <p className="text-sm whitespace-pre-wrap">{msg.body}</p>}
                <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                  {format(new Date(msg.created_at), "HH:mm")}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Enlarged image overlay */}
      {enlargedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          onClick={() => setEnlargedImage(null)}
        >
          <img src={enlargedImage} alt="Enlarged" className="max-w-[90vw] max-h-[90vh] rounded-lg" />
        </div>
      )}

      {/* Input bar */}
      <div className="sticky bottom-0 border-t border-border bg-background px-4 py-3 flex items-center gap-2">
        <label className="cursor-pointer text-muted-foreground hover:text-foreground">
          <Image className="h-5 w-5" />
          <input type="file" accept="image/*" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadMedia(f, "image");
          }} />
        </label>
        <label className="cursor-pointer text-muted-foreground hover:text-foreground">
          <Video className="h-5 w-5" />
          <input type="file" accept="video/*" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadMedia(f, "video");
          }} />
        </label>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1"
          onKeyDown={(e) => { if (e.key === "Enter") sendText(); }}
          disabled={uploading}
        />
        <Button size="icon" onClick={sendText} disabled={!text.trim() || uploading}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
