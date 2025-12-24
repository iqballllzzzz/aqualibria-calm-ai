import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, MessageSquare, Search } from "lucide-react";
import { ChatSession, deleteChatSession } from "@/lib/storage";

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
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredSessions = sessions.filter((session) => {
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    if (session.title.toLowerCase().includes(lowerQuery)) return true;
    return session.messages.some((m) =>
      m.content.toLowerCase().includes(lowerQuery)
    );
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
            className="fixed left-0 top-0 bottom-0 w-80 bg-sidebar border-r border-sidebar-border z-50 flex flex-col"
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
              {filteredSessions.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-10 h-10 mx-auto mb-3 text-sidebar-foreground/30" />
                  <p className="text-sm text-sidebar-foreground/50">
                    {searchQuery ? "No results found" : "No chat history yet"}
                  </p>
                </div>
              ) : (
                filteredSessions.map((session) => (
                  <div
                    key={session.id}
                    className={`group relative rounded-xl p-3 cursor-pointer transition-colors ${
                      currentSessionId === session.id
                        ? "bg-sidebar-accent"
                        : "hover:bg-sidebar-accent/50"
                    }`}
                    onClick={() => onSelectSession(session)}
                  >
                    <div className="pr-8">
                      <p className="text-sm font-medium text-sidebar-foreground truncate">
                        {session.title}
                      </p>
                      <p className="text-xs text-sidebar-foreground/50 mt-1">
                        {formatDate(session.updatedAt)} • {session.messages.length} messages
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(session.id);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-all"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
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
