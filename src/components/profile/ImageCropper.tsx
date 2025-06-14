
import { useState, useRef, useCallback, useEffect } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  
  const [isDragging, setIsDragging] = useState(false);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 200, height: 200 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

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

  const updateCropPosition = useCallback((clientX: number, clientY: number) => {
    const img = imageRef.current;
    const container = containerRef.current;
    if (!img || !container) return;
    
    const rect = container.getBoundingClientRect();
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;
    
    const relativeX = (clientX - rect.left) * scaleX;
    const relativeY = (clientY - rect.top) * scaleY;
    
    const maxX = img.naturalWidth - cropArea.width;
    const maxY = img.naturalHeight - cropArea.height;
    
    const newX = Math.max(0, Math.min(maxX, relativeX - cropArea.width / 2));
    const newY = Math.max(0, Math.min(maxY, relativeY - cropArea.height / 2));
    
    setCropArea(prev => ({
      ...prev,
      x: newX,
      y: newY
    }));
  }, [cropArea.width, cropArea.height]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    // Cancel any pending animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    // Use requestAnimationFrame for smooth updates
    animationFrameRef.current = requestAnimationFrame(() => {
      updateCropPosition(e.clientX, e.clientY);
    });
  }, [isDragging, updateCropPosition]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  // Add global event listeners for smooth dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

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
          <div 
            ref={containerRef}
            className="relative overflow-hidden rounded-lg border bg-muted select-none"
          >
            <img
              ref={imageRef}
              src={image}
              alt="Crop preview"
              className="max-w-full h-auto pointer-events-none"
              onLoad={handleImageLoad}
              draggable={false}
            />
            
            {imageLoaded && imageRef.current && (
              <div
                className="absolute border-2 border-primary bg-primary/20 transition-all duration-75 ease-out"
                style={{
                  left: `${(cropArea.x / imageRef.current.naturalWidth) * 100}%`,
                  top: `${(cropArea.y / imageRef.current.naturalHeight) * 100}%`,
                  width: `${(cropArea.width / imageRef.current.naturalWidth) * 100}%`,
                  height: `${(cropArea.height / imageRef.current.naturalHeight) * 100}%`,
                  cursor: isDragging ? 'grabbing' : 'grab',
                }}
                onMouseDown={handleMouseDown}
              >
                <div className="absolute inset-0 border border-white/50" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-6 bg-primary/80 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                </div>
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
