import React, { useRef, useState } from "react";
import { Image, Loader2, X } from "lucide-react";
import { uploadImage } from "@/lib/api";

interface ImageUploadButtonProps {
  onImageUploaded: (imageUrl: string) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

const ImageUploadButton: React.FC<ImageUploadButtonProps> = ({
  onImageUploaded,
  onError,
  disabled = false,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      onError("Please select an image file");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      onError("Image must be less than 10MB");
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload image
    setIsUploading(true);
    const result = await uploadImage(file);
    setIsUploading(false);

    if (result.success && result.imageUrl) {
      onImageUploaded(result.imageUrl);
    } else {
      setPreviewUrl(null);
      onError(result.error || "Failed to upload image");
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const clearPreview = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {previewUrl ? (
        <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
          <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
          {isUploading ? (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-foreground" />
            </div>
          ) : (
            <button
              onClick={clearPreview}
              className="absolute top-1 right-1 p-0.5 rounded-full bg-background/80 hover:bg-background transition-colors"
            >
              <X className="w-3 h-3 text-foreground" />
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="p-2 rounded-lg hover:bg-accent/50 transition-colors disabled:opacity-50"
        >
          {isUploading ? (
            <Loader2 className="w-5 h-5 animate-spin text-foreground-muted" />
          ) : (
            <Image className="w-5 h-5 text-foreground-muted" />
          )}
        </button>
      )}
    </div>
  );
};

export default ImageUploadButton;