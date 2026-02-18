import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Send, Image, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useSignedUrl } from "@/hooks/useSignedUrl";

type Message = {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  body: string | null;
  media_url: string | null;
  media_type: string;
  created_at: string;
  read_at: string | null;
  _pending?: boolean;
  _failed?: boolean;
};

function MessageBubble({ msg, isMine, onEnlarge, onRetry }: { msg: Message; isMine: boolean; onEnlarge: (url: string) => void; onRetry?: () => void }) {
  const signedUrl = useSignedUrl("media", msg.media_url);

  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[75%] rounded-xl px-3 py-2 shadow-sm ${isMine ? "bg-primary text-primary-foreground" : "bg-card text-foreground border border-border"}`}>
        {msg.media_type === "image" && signedUrl && (
          <img
            src={signedUrl}
            alt="Photo"
            className="rounded-lg max-h-[200px] cursor-pointer"
            onClick={() => onEnlarge(msg.media_url!)}
          />
        )}
        {msg.media_type === "video" && signedUrl && (
          <video src={signedUrl} controls className="rounded-lg max-h-[200px]" />
        )}
        {msg.body && <p className="text-sm whitespace-pre-wrap">{msg.body}</p>}
        <div className="flex items-center gap-1.5 mt-1">
          <p className={`text-[10px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
            {msg._pending ? "Sending..." : msg._failed ? "Failed" : format(new Date(msg.created_at), "HH:mm")}
          </p>
          {msg._failed && onRetry && (
            <button onClick={onRetry} className="text-[10px] underline text-destructive-foreground">
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function EnlargedImageOverlay({ mediaUrl, onClose }: { mediaUrl: string; onClose: () => void }) {
  const signedUrl = useSignedUrl("media", mediaUrl);
  if (!signedUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <img src={signedUrl} alt="Enlarged" className="max-w-[90vw] max-h-[90vh] rounded-lg" />
    </div>
  );
}

export default function Conversation() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [otherName, setOtherName] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
        setMessages((prev) => {
          // If this message was sent by us (optimistic), replace the pending one
          const pendingIdx = prev.findIndex((m) => m._pending && m.sender_user_id === newMsg.sender_user_id && m.body === newMsg.body);
          if (pendingIdx !== -1) {
            const updated = [...prev];
            updated[pendingIdx] = newMsg;
            return updated;
          }
          // Otherwise just append if not already present
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
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

  const sendText = useCallback(async () => {
    if (!text.trim() || !user || !conversationId || sending) return;
    const body = text.trim();
    setText("");
    setSending(true);

    // Optimistic: add pending message
    const tempId = `temp-${Date.now()}`;
    const pendingMsg: Message = {
      id: tempId,
      conversation_id: conversationId,
      sender_user_id: user.id,
      body,
      media_url: null,
      media_type: "text",
      created_at: new Date().toISOString(),
      read_at: null,
      _pending: true,
    };
    setMessages((prev) => [...prev, pendingMsg]);

    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_user_id: user.id,
      body,
      media_type: "text",
    });

    if (error) {
      // Mark as failed
      setMessages((prev) =>
        prev.map((m) => m.id === tempId ? { ...m, _pending: false, _failed: true } : m)
      );
    }
    // On success, realtime subscription will replace the pending message
    setSending(false);
  }, [text, user, conversationId, sending]);

  const retryMessage = useCallback(async (msg: Message) => {
    if (!user || !conversationId) return;
    // Remove failed message and re-send
    setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    setText(msg.body || "");
  }, [user, conversationId]);

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
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_user_id: user.id,
      media_url: path,
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
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            isMine={msg.sender_user_id === user?.id}
            onEnlarge={setEnlargedImage}
            onRetry={msg._failed ? () => retryMessage(msg) : undefined}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Enlarged image overlay */}
      {enlargedImage && (
        <EnlargedImageOverlay mediaUrl={enlargedImage} onClose={() => setEnlargedImage(null)} />
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
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 resize-none rounded-md border border-input px-3 py-2 text-sm bg-white text-black caret-black placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{ WebkitTextFillColor: "#000" }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(); } }}
          disabled={uploading}
        />
        <Button
          size="icon"
          onClick={sendText}
          disabled={!text.trim() || uploading || sending}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
