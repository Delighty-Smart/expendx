import { useState, useRef, useEffect } from "react";
import { Camera, Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from '@capacitor/core';

interface ReceiptScannerProps {
  categories?: string[];
  sharedFileUri?: string | null;
  sharedMimeType?: string | null;
  onDataExtracted: (data: {
    amount: number;
    date?: string;
    merchant: string;
    summary: string;
    category?: string;
    category_suggestions?: string[];
    items?: {
      name: string;
      quantity: number;
      unit_price?: number;
      amount: number;
    }[];
  }) => void;
}

export function ReceiptScanner({ onDataExtracted, categories = [], sharedFileUri, sharedMimeType }: ReceiptScannerProps) {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const autoProcessedRef = useRef(false);

  useEffect(() => {
    const processSharedFile = async () => {
      if (!sharedFileUri || autoProcessedRef.current) return;

      autoProcessedRef.current = true;
      try {
        const webUrl = Capacitor.convertFileSrc(sharedFileUri);
        setPreviewImage(webUrl); // Show early preview

        const response = await fetch(webUrl);
        const blob = await response.blob();
        const file = new File([blob], "shared_receipt.jpg", { type: sharedMimeType || "image/jpeg" });

        processImage(file);
      } catch (error) {
        console.error("Error processing shared file:", error);
        toast({
          title: "Error Loading File",
          description: "Could not load the shared receipt. You can try uploading it manually.",
          variant: "destructive"
        });
      }
    };

    processSharedFile();
  }, [sharedFileUri, sharedMimeType]);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          // Max dimension of 800px for stability during debug
          const maxDimension = 800;
          if (width > height) {
            if (width > maxDimension) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            }
          } else {
            if (height > maxDimension) {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Failed to get canvas context"));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);

          // Higher quality for Gemini to read clearly
          // Lower quality for stability
          const base64 = canvas.toDataURL("image/jpeg", 0.6);
          resolve(base64);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const processImage = async (file: File) => {
    setIsScanning(true);
    console.log("Starting image processing, original size:", (file.size / 1024 / 1024).toFixed(2), "MB");

    try {
      // Create preview immediately
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Compress image for API
      const compressedBase64 = await compressImage(file);
      console.log("Image compressed. Base64 length:", compressedBase64.length);

      console.log("Step 1: Connectivity pulse check...");
      const pulseResult = await supabase.functions.invoke('extract-receipt-data', {
        body: { pulse: true }
      });

      if (pulseResult.error) {
        console.error("Pulse check failed:", pulseResult.error);
        throw new Error(`Connection test failed: ${pulseResult.error.message}`);
      }
      console.log("Pulse check successful!");

      if (!compressedBase64.startsWith('data:image')) {
        throw new Error("Invalid image format generated during compression");
      }

      console.log("Step 2: Sending image payload with categories...");
      // Call edge function
      const { data, error } = await supabase.functions.invoke('extract-receipt-data', {
        body: { imageBase64: compressedBase64, categories }
      });

      if (error) {
        console.error("Supabase function error:", error);
        throw error;
      }

      console.log("Edge function response received:", data);

      if (data?.success && data?.data) {
        onDataExtracted(data.data);
        toast({
          title: "Success",
          description: "Receipt scanned successfully!"
        });
        setPreviewImage(null);
      } else {
        throw new Error(data?.error || 'Failed to extract receipt data');
      }
    } catch (error) {
      console.error('CRITICAL: Error scanning receipt:', error);
      let errorMessage = "Failed to scan receipt. Please try again.";

      if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast({
        title: "Scan Error",
        description: errorMessage,
        variant: "destructive"
      });
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
    <Card className="p-3 border-dashed">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium">Scan Receipt</h3>
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
          <div className="flex flex-col sm:flex-row gap-2">
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
              className="flex-1 h-10 sm:h-9"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isScanning}
            >
              <Camera className="h-4 w-4 mr-2" />
              Take Photo
            </Button>

            <Button
              type="button"
              variant="outline"
              className="flex-1 h-10 sm:h-9"
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
