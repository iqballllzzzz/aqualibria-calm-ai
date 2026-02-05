import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, MessageSquare, Search, MoreVertical, Pin, Archive, Edit2, Check, Share2, ExternalLink, Copy } from "lucide-react";
import { ChatSession, deleteChatSession } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (session: ChatSession) => void;
  onDeleteSession: (sessionId: string) => void;
  onNewChat: () => void;
  pinnedSessions?: string[];
  archivedSessions?: string[];
  onPinSession?: (sessionId: string) => void;
  onArchiveSession?: (sessionId: string) => void;
  onRenameSession?: (sessionId: string, newTitle: string) => void;
}

const ChatHistoryPanel: React.FC<ChatHistoryPanelProps> = ({
  isOpen,
  onClose,
  sessions,
  currentSessionId,
  onSelectSession,
  onDeleteSession,
  onNewChat,
  pinnedSessions = [],
  archivedSessions = [],
  onPinSession,
  onArchiveSession,
  onRenameSession,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const { toast } = useToast();

  const handleShareSession = async (session: ChatSession) => {
    // Generate shareable link
    const shareUrl = `${window.location.origin}/shared/${session.id}`;
    
    // Try to use Web Share API first
    if (navigator.share) {
      try {
        await navigator.share({
          title: `AquaLibriaAI Chat: ${session.title}`,
          text: `Lihat percakapan AI ini: ${session.title}`,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // User cancelled or share failed, fall back to clipboard
      }
    }
    
    // Fall back to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link disalin!",
        description: "Link percakapan telah disalin ke clipboard",
      });
    } catch {
      toast({
        title: "Gagal menyalin",
        description: "Tidak dapat menyalin link ke clipboard",
        variant: "destructive",
      });
    }
  };

  // Filter out archived sessions and apply search
  const visibleSessions = sessions.filter((session) => {
    if (archivedSessions.includes(session.id)) return false;
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    if (session.title.toLowerCase().includes(lowerQuery)) return true;
    return session.messages.some((m) =>
      m.content.toLowerCase().includes(lowerQuery)
    );
  });

  // Sort: pinned first, then by date
  const sortedSessions = [...visibleSessions].sort((a, b) => {
    const aPinned = pinnedSessions.includes(a.id);
    const bPinned = pinnedSessions.includes(b.id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
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

  const handleStartRename = (session: ChatSession) => {
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  const handleConfirmRename = () => {
    if (editingId && editTitle.trim() && onRenameSession) {
      onRenameSession(editingId, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle("");
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
            className="fixed left-0 top-0 bottom-0 w-80 bg-sidebar border-r border-sidebar-border z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-sidebar-border shrink-0">
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
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search chats..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-sidebar-accent border border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/50 focus:outline-none focus:border-sidebar-foreground/30 text-sm"
                />
              </div>
            </div>

            {/* New Chat Button */}
            <div className="p-3 shrink-0">
              <button
                onClick={onNewChat}
                className="w-full py-2.5 rounded-xl bg-sidebar-accent text-sidebar-foreground font-medium hover:bg-sidebar-accent/80 transition-colors flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                New Chat
              </button>
            </div>

            {/* Sessions List */}
            <ScrollArea className="flex-1 px-3">
              <div className="space-y-1 pb-4">
                {sortedSessions.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="w-10 h-10 mx-auto mb-3 text-sidebar-foreground/30" />
                    <p className="text-sm text-sidebar-foreground/50">
                      {searchQuery ? "No results found" : "No chat history yet"}
                    </p>
                  </div>
                ) : (
                  sortedSessions.map((session) => {
                    const isPinned = pinnedSessions.includes(session.id);
                    const isEditing = editingId === session.id;
                    
                    return (
                      <div
                        key={session.id}
                        className={`group relative rounded-xl p-3 cursor-pointer transition-colors ${
                          currentSessionId === session.id
                            ? "bg-sidebar-accent"
                            : "hover:bg-sidebar-accent/50"
                        }`}
                        onClick={() => !isEditing && onSelectSession(session)}
                      >
                        <div className="pr-8">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleConfirmRename()}
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 text-sm font-medium text-sidebar-foreground bg-sidebar border border-sidebar-border rounded px-2 py-1 focus:outline-none focus:border-purple-500"
                                autoFocus
                              />
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleConfirmRename(); }}
                                className="p-1 rounded hover:bg-sidebar-accent"
                              >
                                <Check className="w-4 h-4 text-green-500" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                {isPinned && <Pin className="w-3 h-3 text-purple-500 shrink-0" />}
                                <p className="text-sm font-medium text-sidebar-foreground truncate">
                                  {session.title}
                                </p>
                              </div>
                              <p className="text-xs text-sidebar-foreground/50 mt-1">
                                {formatDate(session.updatedAt)} • {session.messages.length} messages
                              </p>
                            </>
                          )}
                        </div>
                        
                        {/* Three-dot menu */}
                        {!isEditing && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-sidebar-accent transition-all"
                                >
                                  <MoreVertical className="w-4 h-4 text-sidebar-foreground" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                  onClick={(e) => { e.stopPropagation(); handleStartRename(session); }}
                                  className="cursor-pointer"
                                >
                                  <Edit2 className="w-4 h-4 mr-2" />
                                  Rename
                                </DropdownMenuItem>
                                {onPinSession && (
                                  <DropdownMenuItem
                                    onClick={(e) => { e.stopPropagation(); onPinSession(session.id); }}
                                    className="cursor-pointer"
                                  >
                                    <Pin className="w-4 h-4 mr-2" />
                                    {isPinned ? "Unpin" : "Pin"}
                                  </DropdownMenuItem>
                                )}
                                {onArchiveSession && (
                                  <DropdownMenuItem
                                    onClick={(e) => { e.stopPropagation(); onArchiveSession(session.id); }}
                                    className="cursor-pointer"
                                  >
                                    <Archive className="w-4 h-4 mr-2" />
                                    Archive
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={(e) => { e.stopPropagation(); handleShareSession(session); }}
                                  className="cursor-pointer"
                                >
                                  <Share2 className="w-4 h-4 mr-2" />
                                  Share Link
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }}
                                  className="cursor-pointer text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default ChatHistoryPanel;
