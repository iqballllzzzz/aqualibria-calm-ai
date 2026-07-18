import React, { useState } from "react";
import { Copy, Check, ThumbsUp, ThumbsDown, Pencil, Download } from "lucide-react";
import { setMessageReaction, getMessageReaction } from "@/lib/storage";
import { VoiceOption } from "@/lib/api";
import TTSButton from "./TTSButton";
import jsPDF from "jspdf";

interface MessageControlsProps {
  messageId: string;
  sessionId: string;
  content: string;
  className?: string;
  isAssistant?: boolean;
  selectedVoice?: VoiceOption;
  onEdit?: () => void;
}

const MessageControls: React.FC<MessageControlsProps> = ({
  messageId,
  sessionId,
  content,
  className = "",
  isAssistant = false,
  selectedVoice = "eva",
  onEdit,
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

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const cleanText = content
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/#{1,6}\s*/g, "")
      .replace(/`{1,3}[^`]*`{1,3}/g, (m) => m.replace(/`/g, ""))
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    const lines = doc.splitTextToSize(cleanText, 180);
    let y = 15;
    const pageHeight = doc.internal.pageSize.height - 15;

    // Header
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("AquaLibriaAI — Exported Chat", 15, 10);
    doc.setFontSize(10);
    doc.setTextColor(0);

    for (const line of lines) {
      if (y > pageHeight) {
        doc.addPage();
        y = 15;
      }
      doc.text(line, 15, y);
      y += 5;
    }

    doc.save(`aqualibria-chat-${Date.now()}.pdf`);
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {onEdit && (
        <button onClick={onEdit} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors" title="Edit message">
          <Pencil className="w-3.5 h-3.5" />
        </button>
      )}
      <button onClick={handleCopy} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors" title="Copy message">
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
      {isAssistant && (
        <>
          <TTSButton text={content} voice={selectedVoice} />
          <button onClick={handleExportPDF} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors" title="Export PDF">
            <Download className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => handleReaction("like")}
            className={`p-1.5 rounded-md transition-colors ${reaction === "like" ? "text-foreground bg-accent" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"}`} title="Like">
            <ThumbsUp className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => handleReaction("dislike")}
            className={`p-1.5 rounded-md transition-colors ${reaction === "dislike" ? "text-foreground bg-accent" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"}`} title="Dislike">
            <ThumbsDown className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </div>
  );
};

export default MessageControls;
