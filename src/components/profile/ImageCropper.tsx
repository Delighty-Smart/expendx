
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

  // Track drag start for mouse/touch
  const dragStartRef = useRef({ x: 0, y: 0 });
  const cropStartRef = useRef({ x: 0, y: 0 });

  const handleImageLoad = useCallback(() => {
    const img = imageRef.current;
    if (!img) return;
    const size = Math.min(img.naturalWidth, img.naturalHeight) * 0.8;
    const x = (img.naturalWidth - size) / 2;
    const y = (img.naturalHeight - size) / 2;
    setCropArea({ x, y, width: size, height: size });
    setImageLoaded(true);
  }, []);

  // Position update (used for both mouse and touch)
  const updateCropPositionByDelta = useCallback((deltaX: number, deltaY: number) => {
    const img = imageRef.current;
    if (!img) return;
    const maxX = img.naturalWidth - cropArea.width;
    const maxY = img.naturalHeight - cropArea.height;
    const newX = Math.max(0, Math.min(maxX, cropStartRef.current.x + deltaX));
    const newY = Math.max(0, Math.min(maxY, cropStartRef.current.y + deltaY));
    setCropArea(prev => ({
      ...prev,
      x: newX,
      y: newY
    }));
  }, [cropArea.width, cropArea.height]);

  // ---- Mouse events ----
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    cropStartRef.current = { x: cropArea.x, y: cropArea.y };
  }, [cropArea.x, cropArea.y]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(() => {
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;
      updateCropPositionByDelta(
        Math.round(deltaX * (imageRef.current!.naturalWidth / containerRef.current!.getBoundingClientRect().width)),
        Math.round(deltaY * (imageRef.current!.naturalHeight / containerRef.current!.getBoundingClientRect().height)),
      );
    });
  }, [isDragging, updateCropPositionByDelta]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  // ---- Touch events ----
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    setIsDragging(true);
    dragStartRef.current = { x: touch.clientX, y: touch.clientY };
    cropStartRef.current = { x: cropArea.x, y: cropArea.y };
    e.stopPropagation();
    e.preventDefault();
  }, [cropArea.x, cropArea.y]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return;
    if (!containerRef.current || !imageRef.current) return;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(() => {
      const touch = e.touches[0];
      if (!touch) return;
      const deltaX = touch.clientX - dragStartRef.current.x;
      const deltaY = touch.clientY - dragStartRef.current.y;
      updateCropPositionByDelta(
        Math.round(deltaX * (imageRef.current.naturalWidth / containerRef.current.getBoundingClientRect().width)),
        Math.round(deltaY * (imageRef.current.naturalHeight / containerRef.current.getBoundingClientRect().height)),
      );
    });
  }, [isDragging, updateCropPositionByDelta]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  // Register/unregister both mouse and touch events on "document"
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

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
    canvas.width = cropArea.width;
    canvas.height = cropArea.height;
    ctx.drawImage(
      img,
      cropArea.x, cropArea.y, cropArea.width, cropArea.height,
      0, 0, cropArea.width, cropArea.height
    );
    canvas.toBlob((blob) => {
      if (blob) {
        onCrop(blob);
      }
    }, 'image/jpeg', 0.9);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">

        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Crop className="h-5 w-5 text-primary" />
            </div>
            Crop Your Avatar
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div
            ref={containerRef}
            className="relative overflow-hidden rounded-2xl border-none bg-muted/30 select-none touch-none aspect-square flex items-center justify-center p-2"
          >
            <img
              ref={imageRef}
              src={image}
              alt="Crop preview"
              className="max-w-full max-h-full object-contain pointer-events-none rounded-xl shadow-xl"
              onLoad={handleImageLoad}
              draggable={false}
            />

            {imageLoaded && imageRef.current && (
              <div
                className="absolute border-2 border-primary bg-primary/10 transition-all duration-75 ease-out rounded-xl"
                style={{
                  left: `${(cropArea.x / imageRef.current.naturalWidth) * imageRef.current.clientWidth + (containerRef.current!.clientWidth - imageRef.current.clientWidth) / 2}px`,
                  top: `${(cropArea.y / imageRef.current.naturalHeight) * imageRef.current.clientHeight + (containerRef.current!.clientHeight - imageRef.current.clientHeight) / 2}px`,
                  width: `${(cropArea.width / imageRef.current.naturalWidth) * imageRef.current.clientWidth}px`,
                  height: `${(cropArea.height / imageRef.current.naturalHeight) * imageRef.current.clientHeight}px`,
                  cursor: isDragging ? 'grabbing' : 'grab',
                  touchAction: 'none',
                }}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                tabIndex={0}
                role="button"
                aria-label="Drag to reposition crop"
              >
                <div className="absolute inset-0 border border-white/30 rounded-xl" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 bg-primary shadow-lg rounded-full flex items-center justify-center scale-100 hover:scale-110 active:scale-95 transition-transform">
                    <div className="w-2.5 h-2.5 bg-white rounded-full" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <p className="text-sm text-muted-foreground/60 text-center font-medium">
            Drag the crop area to position your avatar perfectly
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            className="h-12 rounded-xl px-6 font-bold text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            className="h-12 rounded-xl px-8 font-bold bg-foreground text-background hover:scale-105 active:scale-95 transition-all"
            onClick={handleCrop}
            disabled={!imageLoaded}
          >
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
