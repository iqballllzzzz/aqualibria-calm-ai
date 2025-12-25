import React, { useState } from "react";
import { Copy, Check, ThumbsUp, ThumbsDown } from "lucide-react";
import { setMessageReaction, getMessageReaction } from "@/lib/storage";

interface MessageControlsProps {
  messageId: string;
  sessionId: string;
  content: string;
  className?: string;
}

const MessageControls: React.FC<MessageControlsProps> = ({
  messageId,
  sessionId,
  content,
  className = "",
}) => {
  const [copied, setCopied] = useState(false);
  const [reaction, setReaction] = useState<"like" | "dislike" | null>(
    getMessageReaction(messageId, sessionId)
  );

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReaction = (type: "like" | "dislike") => {
    const newReaction = reaction === type ? null : type;
    setReaction(newReaction);
    setMessageReaction(messageId, sessionId, newReaction);
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        onClick={handleCopy}
        className="p-1.5 rounded-md text-foreground-muted hover:text-foreground hover:bg-accent/50 transition-colors"
        title="Copy message"
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
      <button
        onClick={() => handleReaction("like")}
        className={`p-1.5 rounded-md transition-colors ${
          reaction === "like"
            ? "text-foreground bg-accent"
            : "text-foreground-muted hover:text-foreground hover:bg-accent/50"
        }`}
        title="Like"
      >
        <ThumbsUp className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => handleReaction("dislike")}
        className={`p-1.5 rounded-md transition-colors ${
          reaction === "dislike"
            ? "text-foreground bg-accent"
            : "text-foreground-muted hover:text-foreground hover:bg-accent/50"
        }`}
        title="Dislike"
      >
        <ThumbsDown className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default MessageControls;