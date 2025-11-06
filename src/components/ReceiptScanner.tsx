import { useState, useRef } from "react";
import { Camera, Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ReceiptScannerProps {
  onScanComplete: (data: {
    amount: number;
    date?: string;
    description: string;
    category?: string;
  }) => void;
}

export function ReceiptScanner({ onScanComplete }: ReceiptScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const processImage = async (file: File) => {
    setIsScanning(true);
    
    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Convert to base64 for API
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      // Call edge function
      const { data, error } = await supabase.functions.invoke('extract-receipt-data', {
        body: { imageBase64: base64 }
      });

      if (error) throw error;

      if (data?.success && data?.data) {
        onScanComplete(data.data);
        toast.success("Receipt scanned successfully!");
        setPreviewImage(null);
      } else {
        throw new Error(data?.error || 'Failed to extract receipt data');
      }
    } catch (error) {
      console.error('Error scanning receipt:', error);
      toast.error("Failed to scan receipt. Please try again or enter manually.");
      setPreviewImage(null);
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processImage(file);
    }
  };

  const handleClearPreview = () => {
    setPreviewImage(null);
    setIsScanning(false);
  };

  return (
    <Card className="p-4 border-dashed">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Scan Receipt</h3>
          {previewImage && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearPreview}
              disabled={isScanning}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {previewImage ? (
          <div className="relative">
            <img
              src={previewImage}
              alt="Receipt preview"
              className="w-full h-48 object-contain rounded-lg bg-muted"
            />
            {isScanning && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Scanning receipt...</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isScanning}
            >
              <Camera className="h-4 w-4 mr-2" />
              Take Photo
            </Button>
            
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanning}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Image
            </Button>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          AI will extract amount, date, merchant, and category from your receipt
        </p>
      </div>
    </Card>
  );
}
