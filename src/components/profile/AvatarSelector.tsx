
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// Define the props for the component
export interface AvatarSelectorProps {
  currentAvatar: string;
  onSelect: (avatar: string) => void;
}

// List of available avatars
const avatars = [
  "avatar-1.png",
  "avatar-2.png",
  "avatar-3.png",
  "avatar-4.png",
  "avatar-5.png",
  "avatar-6.png",
  "avatar-7.png",
  "avatar-8.png"
];

// Function to get the full path for an avatar image
export const getAvatarImageUrl = (avatarFile: string): string => {
  // Handle case when the avatar is already a full URL
  if (avatarFile.startsWith('http')) {
    return avatarFile;
  }
  
  // Use placeholder for testing or when no avatar is provided
  if (!avatarFile) {
    return '/placeholder.svg';
  }
  
  // Check if avatar is one of our predefined ones
  if (avatars.includes(avatarFile)) {
    return `/lovable-uploads/${avatarFile.replace('avatar-', '')}`;
  }
  
  // Default fallback
  return `/lovable-uploads/${avatarFile}`;
};

const AvatarSelector = ({ currentAvatar, onSelect }: AvatarSelectorProps) => {
  const [selected, setSelected] = useState(currentAvatar || avatars[0]);

  const handleSelect = (avatar: string) => {
    setSelected(avatar);
    onSelect(avatar);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-center">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-4 border-primary/20">
          <img 
            src={getAvatarImageUrl(selected)} 
            alt="Selected avatar"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
      
      <ScrollArea className="h-24 rounded-lg border">
        <div className="flex flex-wrap gap-2 p-2 items-center justify-center">
          {avatars.map((avatar) => (
            <Button
              key={avatar}
              variant="ghost"
              className={cn(
                "p-0 w-12 h-12 rounded-full overflow-hidden",
                selected === avatar && "ring-2 ring-primary"
              )}
              onClick={() => handleSelect(avatar)}
            >
              <img 
                src={getAvatarImageUrl(avatar)} 
                alt={`Avatar option ${avatar}`}
                className="w-full h-full object-cover"
              />
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

// Add the static method to the component
(AvatarSelector as any).getAvatarImageUrl = getAvatarImageUrl;

export default AvatarSelector;
