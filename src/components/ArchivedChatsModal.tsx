import React from "react";
import { motion } from "framer-motion";
import { Archive, Trash2, RotateCcw, MessageSquare } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatSession } from "@/lib/storage";

interface ArchivedChatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  archivedIds: string[];
  onRestoreSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onSelectSession: (session: ChatSession) => void;
}

const ArchivedChatsModal: React.FC<ArchivedChatsModalProps> = ({
  isOpen,
  onClose,
  sessions,
  archivedIds,
  onRestoreSession,
  onDeleteSession,
  onSelectSession,
}) => {
  const archivedSessions = sessions.filter(s => archivedIds.includes(s.id));

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Archive className="w-5 h-5 text-purple-500" />
            Archived Chats
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {archivedSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Archive className="w-16 h-16 text-foreground-muted/30 mb-4" />
              <p className="text-foreground-muted text-center">No archived chats</p>
              <p className="text-sm text-foreground-muted/70 text-center mt-1">
                Archived chats will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {archivedSessions.map((session, index) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group p-4 rounded-xl bg-muted hover:bg-accent transition-colors"
                >
                  <div 
                    className="cursor-pointer"
                    onClick={() => { onSelectSession(session); onClose(); }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center shrink-0">
                        <MessageSquare className="w-5 h-5 text-foreground-muted" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{session.title}</p>
                        <p className="text-xs text-foreground-muted mt-1">
                          {formatDate(session.updatedAt)} • {session.messages.length} messages
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                    <button
                      onClick={() => onRestoreSession(session.id)}
                      className="flex-1 py-2 rounded-lg bg-background hover:bg-accent transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Restore
                    </button>
                    <button
                      onClick={() => onDeleteSession(session.id)}
                      className="flex-1 py-2 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ArchivedChatsModal;
