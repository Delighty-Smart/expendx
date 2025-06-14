
import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Crop, RotateCcw, Check, X } from "lucide-react";

interface ImageCropperProps {
  image: string;
  isOpen: boolean;
  onClose: () => void;
  onCrop: (croppedImage: Blob) => void;
}

const ImageCropper = ({ image, isOpen, onClose, onCrop }: ImageCropperProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 200, height: 200 });
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleImageLoad = useCallback(() => {
    const img = imageRef.current;
    if (!img) return;
    
    // Center the crop area and make it square
    const size = Math.min(img.naturalWidth, img.naturalHeight) * 0.8;
    const x = (img.naturalWidth - size) / 2;
    const y = (img.naturalHeight - size) / 2;
    
    setCropArea({ x, y, width: size, height: size });
    setImageLoaded(true);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !imageRef.current) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const scaleX = imageRef.current.naturalWidth / rect.width;
    const scaleY = imageRef.current.naturalHeight / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    const maxX = imageRef.current.naturalWidth - cropArea.width;
    const maxY = imageRef.current.naturalHeight - cropArea.height;
    
    setCropArea(prev => ({
      ...prev,
      x: Math.max(0, Math.min(maxX, x - prev.width / 2)),
      y: Math.max(0, Math.min(maxY, y - prev.height / 2))
    }));
  }, [isDragging, cropArea.width, cropArea.height]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleCrop = async () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to crop area
    canvas.width = cropArea.width;
    canvas.height = cropArea.height;

    // Draw the cropped portion
    ctx.drawImage(
      img,
      cropArea.x, cropArea.y, cropArea.width, cropArea.height,
      0, 0, cropArea.width, cropArea.height
    );

    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob) {
        onCrop(blob);
      }
    }, 'image/jpeg', 0.9);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crop className="h-5 w-5" />
            Crop Your Avatar
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-lg border bg-muted">
            <img
              ref={imageRef}
              src={image}
              alt="Crop preview"
              className="max-w-full h-auto"
              onLoad={handleImageLoad}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            />
            
            {imageLoaded && (
              <div
                className="absolute border-2 border-primary bg-primary/20 cursor-move"
                style={{
                  left: `${(cropArea.x / imageRef.current!.naturalWidth) * 100}%`,
                  top: `${(cropArea.y / imageRef.current!.naturalHeight) * 100}%`,
                  width: `${(cropArea.width / imageRef.current!.naturalWidth) * 100}%`,
                  height: `${(cropArea.height / imageRef.current!.naturalHeight) * 100}%`,
                }}
                onMouseDown={handleMouseDown}
              >
                <div className="absolute inset-0 border border-white/50" />
              </div>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground text-center">
            Drag the crop area to position your avatar
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleCrop} disabled={!imageLoaded}>
            <Check className="h-4 w-4 mr-2" />
            Apply Crop
          </Button>
        </DialogFooter>
        
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
};

export default ImageCropper;
