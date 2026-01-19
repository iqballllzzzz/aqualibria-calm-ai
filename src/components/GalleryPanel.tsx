import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Image as ImageIcon, Download, ExternalLink } from "lucide-react";
import { getChatHistory, ChatSession } from "@/lib/storage";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface GalleryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GalleryImage {
  url: string;
  type: "generated" | "uploaded";
  date: Date;
  sessionId: string;
  prompt?: string;
}

const GalleryPanel: React.FC<GalleryPanelProps> = ({ isOpen, onClose }) => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadImages();
    }
  }, [isOpen]);

  const loadImages = () => {
    const sessions = getChatHistory();
    const allImages: GalleryImage[] = [];

    sessions.forEach(session => {
      session.messages.forEach(msg => {
        if (msg.imageUrl) {
          allImages.push({
            url: msg.imageUrl,
            type: msg.role === "assistant" ? "generated" : "uploaded",
            date: new Date(msg.timestamp),
            sessionId: session.id,
            prompt: msg.content // For generated images, content usually contains the context
          });
        }
      });
    });

    // Sort by newest
    allImages.sort((a, b) => b.date.getTime() - a.date.getTime());
    setImages(allImages);
  };

  const handleDownload = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error("Download failed", e);
      window.open(url, "_blank");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-4 md:inset-10 bg-sidebar border border-sidebar-border rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-sidebar-border flex items-center justify-between bg-sidebar">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-purple-500" />
                <h2 className="text-lg font-semibold text-sidebar-foreground">Gallery</h2>
                <span className="text-xs bg-sidebar-accent px-2 py-0.5 rounded-full text-foreground-muted">
                  {images.length} items
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors"
              >
                <X className="w-5 h-5 text-sidebar-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden p-4">
              <Tabs defaultValue="all" className="h-full flex flex-col">
                <TabsList className="bg-sidebar-accent mb-4">
                  <TabsTrigger value="all">All Images</TabsTrigger>
                  <TabsTrigger value="generated">Generated</TabsTrigger>
                  <TabsTrigger value="uploaded">Uploaded</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="flex-1 mt-0">
                  <ScrollArea className="h-full pr-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {images.map((img, idx) => (
                        <div
                          key={idx}
                          className="group relative aspect-square rounded-xl overflow-hidden border border-border cursor-zoom-in bg-accent/20"
                          onClick={() => setSelectedImage(img)}
                        >
                          <img
                            src={img.url}
                            alt="Gallery item"
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                            <span className="text-xs text-white/80 truncate w-full">
                              {img.date.toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="generated" className="flex-1 mt-0">
                   <ScrollArea className="h-full pr-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {images.filter(i => i.type === "generated").map((img, idx) => (
                        <div
                          key={idx}
                          className="group relative aspect-square rounded-xl overflow-hidden border border-border cursor-zoom-in bg-accent/20"
                          onClick={() => setSelectedImage(img)}
                        >
                          <img
                            src={img.url}
                            alt="Generated"
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            loading="lazy"
                          />
                          <div className="absolute top-2 right-2 bg-purple-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">AI</div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="uploaded" className="flex-1 mt-0">
                   <ScrollArea className="h-full pr-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {images.filter(i => i.type === "uploaded").map((img, idx) => (
                        <div
                          key={idx}
                          className="group relative aspect-square rounded-xl overflow-hidden border border-border cursor-zoom-in bg-accent/20"
                          onClick={() => setSelectedImage(img)}
                        >
                          <img
                            src={img.url}
                            alt="Uploaded"
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            loading="lazy"
                          />
                          <div className="absolute top-2 right-2 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">USER</div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          </motion.div>

          {/* Lightbox */}
          {selectedImage && (
             <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="fixed inset-0 z-[60] bg-black/95 flex flex-col"
               onClick={() => setSelectedImage(null)}
             >
               <div className="absolute top-4 right-4 flex gap-2">
                 <button
                   onClick={(e) => { e.stopPropagation(); handleDownload(selectedImage.url); }}
                   className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
                 >
                   <Download className="w-5 h-5" />
                 </button>
                 <button
                   onClick={() => setSelectedImage(null)}
                   className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
                 >
                   <X className="w-5 h-5" />
                 </button>
               </div>

               <div className="flex-1 flex items-center justify-center p-4">
                 <img
                   src={selectedImage.url}
                   alt="Full view"
                   className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                   onClick={(e) => e.stopPropagation()}
                 />
               </div>

               <div className="p-4 bg-black/50 text-white text-center">
                 <p className="text-sm opacity-70">
                   {selectedImage.type === "generated" ? "Generated by AI" : "Uploaded by User"} • {selectedImage.date.toLocaleString()}
                 </p>
               </div>
             </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
};

export default GalleryPanel;
