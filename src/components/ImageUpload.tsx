
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, Image } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  onImageRemove: () => void;
  previewUrl?: string | null;
  accept?: string;
  maxSize?: number; // in MB
  className?: string;
  buttonText?: string;
  disabled?: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageSelect,
  onImageRemove,
  previewUrl,
  accept = "image/*",
  maxSize = 5,
  className = "",
  buttonText = "Upload Image",
  disabled = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      toast({
        title: "File too large",
        description: `Please upload an image smaller than ${maxSize}MB.`,
        variant: "destructive",
      });
      return;
    }

    onImageSelect(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={triggerFileInput}
          disabled={disabled}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          {buttonText}
        </Button>
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={accept}
          className="hidden"
          disabled={disabled}
        />
        
        <span className="text-sm text-muted-foreground">
          Max {maxSize}MB • JPG, PNG, WEBP
        </span>
      </div>

      {previewUrl && (
        <div className="relative inline-block">
          <div className="relative rounded-lg overflow-hidden border border-border bg-muted">
            <img
              src={previewUrl}
              alt="Upload preview"
              className="max-h-48 w-auto object-contain"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2"
              onClick={onImageRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
