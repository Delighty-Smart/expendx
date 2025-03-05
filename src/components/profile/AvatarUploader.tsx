
import { useState } from "react";
import { User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AvatarUploaderProps {
  currentAvatarUrl: string | null;
  userId: string;
  onAvatarUpdate: (url: string) => void;
}

const AvatarUploader = ({ currentAvatarUrl, userId, onAvatarUpdate }: AvatarUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  
  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;
      
      // File size validation (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Avatar image must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      
      setIsUploading(true);
      
      // Create form data for the upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);
      
      // Upload to Supabase Edge Function
      const response = await fetch(
        'https://wulhjbwijgbticuslygm.supabase.co/functions/v1/upload-profile-avatar',
        {
          method: 'POST',
          body: formData,
        }
      );
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload avatar');
      }
      
      // Update component state with new avatar URL
      onAvatarUpdate(result.url);
      
      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated successfully",
      });
      
    } catch (error) {
      console.error("Avatar upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload avatar",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <div className="flex flex-col items-center space-y-4">
      <Avatar className="h-24 w-24 border-2 border-primary/20 animate-glow">
        <AvatarImage src={currentAvatarUrl || undefined} />
        <AvatarFallback className="bg-primary/10">
          <User className="h-12 w-12 text-primary/70" />
        </AvatarFallback>
      </Avatar>
      
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isUploading}
          className="relative overflow-hidden hover:bg-primary/10 transition-all duration-300"
        >
          {isUploading ? "Uploading..." : "Change Avatar"}
          <input
            type="file"
            accept="image/*"
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={uploadAvatar}
            disabled={isUploading}
          />
        </Button>
        
        {currentAvatarUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isUploading}
            onClick={() => onAvatarUpdate("")}
            className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
          >
            Remove
          </Button>
        )}
      </div>
    </div>
  );
};

export default AvatarUploader;
