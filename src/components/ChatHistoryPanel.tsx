import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, MessageSquare, Search, MoreVertical, Archive, Pin, Edit3 } from "lucide-react";
import { ChatSession, deleteChatSession, saveChatSession } from "@/lib/storage";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface ChatHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (session: ChatSession) => void;
  onDeleteSession: (sessionId: string) => void;
  onNewChat: () => void;
}

const ChatHistoryPanel: React.FC<ChatHistoryPanelProps> = ({
  isOpen,
  onClose,
  sessions,
  currentSessionId,
  onSelectSession,
  onDeleteSession,
  onNewChat,
}) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const handleAction = (session: ChatSession, action: "pin" | "archive" | "rename") => {
    const updatedSession = { ...session };

    if (action === "pin") {
      updatedSession.isPinned = !session.isPinned;
      toast({ title: session.isPinned ? "Chat Unpinned" : "Chat Pinned" });
    } else if (action === "archive") {
      updatedSession.isArchived = !session.isArchived;
      toast({ title: session.isArchived ? "Chat Unarchived" : "Chat Archived" });
    } else if (action === "rename") {
      setEditingId(session.id);
      setEditTitle(session.title);
      return; // Stop here, save happens on enter/blur
    }

    saveChatSession(updatedSession);
    // Force re-render handled by parent triggering update or we need local state if props don't update immediately
    // Ideally parent should pass a refresh function or re-fetch
    window.dispatchEvent(new Event("storage")); // Hack to trigger updates if components listen to storage
  };

  const handleRenameSubmit = (sessionId: string) => {
    if (!editTitle.trim()) return;
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      saveChatSession({ ...session, title: editTitle.trim() });
      setEditingId(null);
      toast({ title: "Chat Renamed" });
    }
  };

  // Filter and Sort
  const processedSessions = sessions
    .filter((session) => !session.isArchived) // Hide archived
    .filter((session) => {
      if (!searchQuery) return true;
      const lowerQuery = searchQuery.toLowerCase();
      return (
        session.title.toLowerCase().includes(lowerQuery) ||
        session.messages.some((m) => m.content.toLowerCase().includes(lowerQuery))
      );
    })
    .sort((a, b) => {
      // Pinned first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      // Then by date
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/10 z-40"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 bottom-0 w-80 bg-sidebar border-r border-sidebar-border z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="p-4 border-b border-sidebar-border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-sidebar-foreground">Chat History</h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors"
                >
                  <X className="w-5 h-5 text-sidebar-foreground" />
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-foreground/50" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search chats..."
                  className="w-full pl-10 pr-4 py-2 bg-sidebar-accent border-sidebar-border text-sidebar-foreground focus-visible:ring-1 focus-visible:ring-purple-500"
                />
              </div>
            </div>

            {/* New Chat Button */}
            <div className="p-3">
              <button
                onClick={onNewChat}
                className="w-full py-2.5 rounded-xl bg-sidebar-accent text-sidebar-foreground font-medium hover:bg-sidebar-accent/80 transition-colors flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                New Chat
              </button>
            </div>

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
              {processedSessions.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-10 h-10 mx-auto mb-3 text-sidebar-foreground/30" />
                  <p className="text-sm text-sidebar-foreground/50">
                    {searchQuery ? "No results found" : "No active chats"}
                  </p>
                </div>
              ) : (
                processedSessions.map((session) => (
                  <div
                    key={session.id}
                    className={`group relative rounded-xl p-3 cursor-pointer transition-all ${
                      currentSessionId === session.id
                        ? "bg-sidebar-accent"
                        : "hover:bg-sidebar-accent/50"
                    }`}
                    onClick={() => onSelectSession(session)}
                  >
                    <div className="pr-8">
                      {editingId === session.id ? (
                        <Input
                          autoFocus
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRenameSubmit(session.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          onBlur={() => handleRenameSubmit(session.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-7 py-0 px-1 text-sm bg-background"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          {session.isPinned && <Pin className="w-3 h-3 text-purple-500 shrink-0" />}
                          <p className={`text-sm font-medium truncate ${currentSessionId === session.id ? "text-sidebar-foreground" : "text-sidebar-foreground/80"}`}>
                            {session.title}
                          </p>
                        </div>
                      )}

                      <p className="text-xs text-sidebar-foreground/50 mt-1">
                        {formatDate(session.updatedAt)} • {session.messages.length} msgs
                      </p>
                    </div>

                    {/* Action Menu */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 rounded-md hover:bg-background/50">
                            <MoreVertical className="w-4 h-4 text-sidebar-foreground/70" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAction(session, "rename"); }}>
                            <Edit3 className="w-4 h-4 mr-2" /> Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAction(session, "pin"); }}>
                            <Pin className="w-4 h-4 mr-2" /> {session.isPinned ? "Unpin" : "Pin"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAction(session, "archive"); }}>
                            <Archive className="w-4 h-4 mr-2" /> Archive
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default ChatHistoryPanel;
