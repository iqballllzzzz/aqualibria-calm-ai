import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Image as ImageIcon, Download, Trash2, Search, Grid, List } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getChatHistory, ChatSession } from "@/lib/storage";

interface ImageGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GalleryImage {
  url: string;
  type: "uploaded" | "generated";
  timestamp: Date;
  sessionTitle: string;
}

const ImageGalleryModal: React.FC<ImageGalleryModalProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Extract all images from chat history
  const allImages = useMemo(() => {
    const history = getChatHistory();
    const images: GalleryImage[] = [];
    
    history.forEach((session: ChatSession) => {
      session.messages.forEach((message) => {
        if (message.imageUrl) {
          images.push({
            url: message.imageUrl,
            type: message.role === "user" ? "uploaded" : "generated",
            timestamp: new Date(message.timestamp),
            sessionTitle: session.title,
          });
        }
      });
    });
    
    // Sort by newest first
    return images.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [isOpen]);

  const uploadedImages = allImages.filter(img => img.type === "uploaded");
  const generatedImages = allImages.filter(img => img.type === "generated");

  const filteredImages = (images: GalleryImage[]) => {
    if (!searchQuery) return images;
    return images.filter(img => 
      img.sessionTitle.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDownload = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `aqua-image-${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const renderImageGrid = (images: GalleryImage[]) => {
    const filtered = filteredImages(images);
    
    if (filtered.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <ImageIcon className="w-16 h-16 text-foreground-muted/30 mb-4" />
          <p className="text-foreground-muted text-center">
            {searchQuery ? "No images found" : "No images yet"}
          </p>
        </div>
      );
    }

    return (
      <div className={viewMode === "grid" 
        ? "grid grid-cols-2 sm:grid-cols-3 gap-3"
        : "space-y-3"
      }>
        {filtered.map((image, index) => (
          <motion.div
            key={`${image.url}-${index}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className={`group relative rounded-xl overflow-hidden border border-border bg-muted ${
              viewMode === "list" ? "flex items-center gap-4 p-3" : "aspect-square"
            }`}
          >
            <img
              src={image.url}
              alt="Gallery image"
              className={`object-cover cursor-pointer transition-transform group-hover:scale-105 ${
                viewMode === "grid" ? "w-full h-full" : "w-20 h-20 rounded-lg shrink-0"
              }`}
              onClick={() => setSelectedImage(image.url)}
              loading="lazy"
            />
            
            {viewMode === "list" && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{image.sessionTitle}</p>
                <p className="text-xs text-foreground-muted">{formatDate(image.timestamp)}</p>
              </div>
            )}
            
            {/* Overlay actions */}
            <div className={`absolute ${viewMode === "grid" ? "inset-0" : "right-0 top-0 bottom-0 w-24"} bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3 gap-2`}>
              <button
                onClick={() => handleDownload(image.url)}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                <Download className="w-4 h-4 text-white" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-3xl max-h-[85vh] p-0 bg-background border-border overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-purple-500" />
                Image Gallery
              </DialogTitle>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-lg transition-colors ${viewMode === "grid" ? "bg-accent" : "hover:bg-accent"}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-lg transition-colors ${viewMode === "list" ? "bg-accent" : "hover:bg-accent"}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Search */}
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by chat title..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted border border-border text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-purple-500 text-sm"
              />
            </div>
          </DialogHeader>

          <Tabs defaultValue="all" className="flex-1 flex flex-col">
            <TabsList className="mx-4 mt-4 mb-2">
              <TabsTrigger value="all">All ({allImages.length})</TabsTrigger>
              <TabsTrigger value="uploaded">Uploaded ({uploadedImages.length})</TabsTrigger>
              <TabsTrigger value="generated">Generated ({generatedImages.length})</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 px-4 pb-4">
              <TabsContent value="all" className="mt-0">
                {renderImageGrid(allImages)}
              </TabsContent>
              <TabsContent value="uploaded" className="mt-0">
                {renderImageGrid(uploadedImages)}
              </TabsContent>
              <TabsContent value="generated" className="mt-0">
                {renderImageGrid(generatedImages)}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Image Viewer Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4" 
            onClick={() => setSelectedImage(null)}
          >
            <button 
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20"
              onClick={() => setSelectedImage(null)}
            >
              <X className="w-6 h-6 text-white" />
            </button>
            <img 
              src={selectedImage} 
              alt="Full size" 
              className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl" 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ImageGalleryModal;
