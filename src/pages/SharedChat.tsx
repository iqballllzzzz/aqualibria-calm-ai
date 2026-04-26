import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MessageSquare, ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import Logo from "@/components/Logo";

interface SharedMessage {
  role: string;
  content: string;
  timestamp: string;
  fileName?: string;
}

interface SharedChatData {
  id: string;
  title: string;
  shared_by_name: string;
  messages: SharedMessage[];
  created_at: string;
}

const SharedChat: React.FC = () => {
  const { shareId } = useParams();
  const [chat, setChat] = useState<SharedChatData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSharedChat = async () => {
      if (!shareId) { setError("Invalid share link"); setLoading(false); return; }

      try {
        const { data, error: fetchError } = await supabase
          .from("shared_chats")
          .select("*")
          .eq("id", shareId)
          .single();

        if (fetchError || !data) {
          setError("Shared chat not found or has expired");
        } else {
          setChat(data as unknown as SharedChatData);
        }
      } catch {
        setError("Failed to load shared chat");
      }
      setLoading(false);
    };

    loadSharedChat();
  }, [shareId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !chat) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-foreground-muted" />
          <h1 className="text-xl font-bold text-foreground mb-2">Chat Not Found</h1>
          <p className="text-foreground-muted text-sm mb-6">{error || "This shared chat doesn't exist or has expired."}</p>
          <Link to="/login" className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:shadow-lg transition-all">
            <ExternalLink className="w-4 h-4" />
            Try AquaLibriaAI
          </Link>
        </div>
      </div>
    );
  }

  const messages = Array.isArray(chat.messages) ? chat.messages : [];

  return (
    <div className="min-h-screen bg-background relative">
      <div className="spotlight spotlight-violet" style={{ width: "44vw", height: "44vw", top: "-15%", left: "-15%", opacity: 0.14 }} />
      <div className="spotlight spotlight-cyan" style={{ width: "36vw", height: "36vw", bottom: "-10%", right: "-10%", opacity: 0.12 }} />

      {/* Header */}
      <header className="sticky top-0 z-30 surface-glass border-b border-border/60">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <div>
              <h1 className="text-sm font-display font-bold tracking-tight text-foreground truncate max-w-[200px]">{chat.title}</h1>
              <p className="text-[10px] text-foreground-muted">Shared by {chat.shared_by_name}</p>
            </div>
          </div>
          <Link to="/login" className="btn-brand !px-3 !py-1.5 !text-xs">
            Try AqualibriaAI
          </Link>
        </div>
      </header>

      {/* Messages */}
      <main className="max-w-2xl mx-auto px-4 py-6 relative z-10 page-fade-in">
        <div className="space-y-6">
          {messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.03 }}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[85%] ${
                message.role === "user"
                  ? "bg-primary/10 rounded-3xl rounded-br-lg px-4 py-3 border border-primary/10"
                  : "px-1 py-1"
              }`}>
                {message.role === "assistant" ? (
                  <MarkdownRenderer content={message.content} />
                ) : (
                  <p className="whitespace-pre-wrap leading-relaxed break-words text-sm text-foreground">{message.content}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="mt-12 text-center pb-8">
          <p className="text-foreground-muted text-sm mb-4">Want to have your own AI conversations?</p>
          <Link to="/register" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold hover:shadow-lg hover:shadow-primary/20 transition-all">
            <MessageSquare className="w-4 h-4" />
            Start Chatting with AquaLibriaAI
          </Link>
        </div>
      </main>
    </div>
  );
};

export default SharedChat;
