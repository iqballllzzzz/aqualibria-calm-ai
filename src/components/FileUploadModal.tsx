import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Image as ImageIcon, FileText, Film, Loader2 } from "lucide-react";

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File, type: "image" | "video" | "file") => void;
  type: "image" | "video" | "file";
}

const FileUploadModal: React.FC<FileUploadModalProps> = ({ isOpen, onClose, onUpload, type }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAcceptedTypes = () => {
    switch (type) {
      case "image":
        return "image/*";
      case "video":
        return "video/*";
      case "file":
        return ".pdf,.doc,.docx,.txt,.json,.csv,.xlsx,.xls";
      default:
        return "*";
    }
  };

  const getIcon = () => {
    switch (type) {
      case "image":
        return ImageIcon;
      case "video":
        return Film;
      case "file":
        return FileText;
      default:
        return Upload;
    }
  };

  const getTitle = () => {
    switch (type) {
      case "image":
        return "Upload Image";
      case "video":
        return "Upload Video";
      case "file":
        return "Upload File";
      default:
        return "Upload";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    
    if (type === "image" && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else if (type === "video" && file.type.startsWith("video/")) {
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    
    // Simulate upload delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    onUpload(selectedFile, type);
    setIsUploading(false);
    setSelectedFile(null);
    setPreview(null);
    onClose();
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreview(null);
    onClose();
  };

  const Icon = getIcon();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-w-md bg-card border border-border rounded-2xl shadow-elevated overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                  <Icon className="w-5 h-5 text-foreground" />
                </div>
                <h2 className="font-semibold text-foreground">{getTitle()}</h2>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg hover:bg-accent transition-colors"
              >
                <X className="w-5 h-5 text-foreground-muted" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              <input
                ref={fileInputRef}
                type="file"
                accept={getAcceptedTypes()}
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
              />

              {!selectedFile ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    isDragging
                      ? "border-foreground bg-accent"
                      : "border-border hover:border-foreground/30 hover:bg-accent/50"
                  }`}
                >
                  <Upload className="w-10 h-10 mx-auto mb-4 text-foreground-muted" />
                  <p className="text-foreground font-medium mb-1">
                    Drop your {type} here
                  </p>
                  <p className="text-sm text-foreground-muted">
                    or click to browse
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Preview */}
                  {preview && type === "image" && (
                    <div className="rounded-xl overflow-hidden border border-border">
                      <img
                        src={preview}
                        alt="Preview"
                        className="w-full h-48 object-cover"
                      />
                    </div>
                  )}
                  
                  {preview && type === "video" && (
                    <div className="rounded-xl overflow-hidden border border-border">
                      <video
                        src={preview}
                        controls
                        className="w-full h-48 object-cover"
                      />
                    </div>
                  )}
                  
                  {type === "file" && (
                    <div className="p-4 rounded-xl bg-accent flex items-center gap-3">
                      <FileText className="w-8 h-8 text-foreground-muted" />
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground font-medium truncate">
                          {selectedFile.name}
                        </p>
                        <p className="text-sm text-foreground-muted">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* File info for images/videos */}
                  {type !== "file" && (
                    <div className="text-sm text-foreground-muted text-center">
                      {selectedFile.name} • {(selectedFile.size / 1024).toFixed(1)} KB
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 py-3 rounded-xl border border-border text-foreground font-medium hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="flex-1 py-3 rounded-xl bg-foreground text-background font-medium hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FileUploadModal;
