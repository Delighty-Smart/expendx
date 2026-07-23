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

  const [showOptions, setShowOptions] = useState(false);

  return (
    <div className="w-full">
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

      {previewImage ? (
        <Card className="p-3 relative border border-muted/60 bg-muted/10 rounded-2xl">
          <div className="relative">
            <img
              src={previewImage}
              alt="Receipt preview"
              className="w-full h-40 object-contain rounded-lg bg-black/10"
            />
            {isScanning ? (
              <div className="absolute inset-0 flex items-center justify-center bg-background/85 rounded-lg">
                <div className="flex flex-col items-center gap-1.5">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground font-medium">Extracting receipt data...</p>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClearPreview}
                className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/80 shadow-md text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {!showOptions ? (
            <Button
              type="button"
              variant="action"
              size="xs"
              className="w-full h-9 rounded-xl flex items-center justify-center gap-2 border border-border-default/45"
              onClick={() => setShowOptions(true)}
            >
              <Camera className="h-4 w-4" />
              <span>Scan or Upload Receipt</span>
            </Button>
          ) : (
            <div className="flex gap-2 items-center bg-muted/10 p-2 rounded-2xl border border-dashed border-border/40">
              <Button
                type="button"
                variant="outline"
                size="xs"
                className="flex-1 h-8 rounded-lg"
                onClick={() => {
                  cameraInputRef.current?.click();
                  setShowOptions(false);
                }}
              >
                <Camera className="h-3.5 w-3.5 mr-1" />
                Camera
              </Button>
              <Button
                type="button"
                variant="outline"
                size="xs"
                className="flex-1 h-8 rounded-lg"
                onClick={() => {
                  fileInputRef.current?.click();
                  setShowOptions(false);
                }}
              >
                <Upload className="h-3.5 w-3.5 mr-1" />
                Upload
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="h-8 w-8 p-0 rounded-full"
                onClick={() => setShowOptions(false)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
