
import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check } from "lucide-react";

const avatars = [
  // Male avatars
  { id: "m1", src: "/lovable-uploads/167baf60-e95c-4360-a687-d246ef45f33e.png", alt: "Male avatar 1" },
  { id: "m2", src: "/lovable-uploads/2bcde0f4-1483-4e84-a8e4-0227c5bdc9e8.png", alt: "Male avatar 2" },
  { id: "m3", src: "/lovable-uploads/115fca3f-2e5d-4860-a624-20f8a47ba447.png", alt: "Male avatar 3" },
  { id: "m4", src: "/lovable-uploads/23786936-39a8-4e94-9eb3-3464ed7ffc82.png", alt: "Male avatar 4" },
  { id: "m5", src: "/lovable-uploads/87a85edd-1a8a-44f7-92c9-dd1273fccf8c.png", alt: "Male avatar 5" },
  // Female avatars
  { id: "f1", src: "/lovable-uploads/c2a2d26c-0523-4fb9-9813-51aac4bc3987.png", alt: "Female avatar 1" },
  // Add placeholder images for the rest of the avatars
  { id: "f2", src: "/placeholder.svg", alt: "Female avatar 2" },
  { id: "f3", src: "/placeholder.svg", alt: "Female avatar 3" },
  { id: "f4", src: "/placeholder.svg", alt: "Female avatar 4" },
  { id: "f5", src: "/placeholder.svg", alt: "Female avatar 5" },
  // Animal avatars
  { id: "a1", src: "/placeholder.svg", alt: "Animal avatar 1" },
  { id: "a2", src: "/placeholder.svg", alt: "Animal avatar 2" },
  { id: "a3", src: "/placeholder.svg", alt: "Animal avatar 3" },
  { id: "a4", src: "/placeholder.svg", alt: "Animal avatar 4" },
  { id: "a5", src: "/placeholder.svg", alt: "Animal avatar 5" },
  // Additional avatar variations
  { id: "v1", src: "/placeholder.svg", alt: "Avatar variation 1" },
  { id: "v2", src: "/placeholder.svg", alt: "Avatar variation 2" },
  { id: "v3", src: "/placeholder.svg", alt: "Avatar variation 3" },
  { id: "v4", src: "/placeholder.svg", alt: "Avatar variation 4" },
  { id: "v5", src: "/placeholder.svg", alt: "Avatar variation 5" },
];

// Helper to get avatar image URL - making it static
export const getAvatarImageUrl = (key: string): string => {
  // This should match the logic in UserSearch and other components
  const avatarImages: Record<string, string> = {
    "avatar-1.png": "/lovable-uploads/c2a2d26c-0523-4fb9-9813-51aac4bc3987.png",
    "avatar-2.png": "/lovable-uploads/23786936-39a8-4e94-9eb3-3464ed7ffc82.png",
    "avatar-3.png": "/lovable-uploads/2bcde0f4-1483-4e84-a8e4-0227c5bdc9e8.png",
    "avatar-4.png": "/lovable-uploads/167baf60-e95c-4360-a687-d246ef45f33e.png",
    "avatar-5.png": "/lovable-uploads/115fca3f-2e5d-4860-a624-20f8a47ba447.png",
    "avatar-6.png": "/lovable-uploads/87a85edd-1a8a-44f7-92c9-dd1273fccf8c.png",
  };
  
  return avatarImages[key] || 
    `https://api.dicebear.com/7.x/personas/svg?seed=${key}&backgroundColor=ffdfbf,ffd5dc,d1d4f9,c0aede,b6e3f4`;
};

interface AvatarSelectorProps {
  currentAvatar?: string;
  selectedAvatar?: string;
  onSelect?: (avatarUrl: string) => void;
  onSelectAvatar?: (avatarUrl: string) => void;
}

const AvatarSelector: React.FC<AvatarSelectorProps> = ({
  currentAvatar = "/placeholder.svg",
  selectedAvatar,
  onSelect,
  onSelectAvatar,
}) => {
  const [selected, setSelected] = useState<string>(selectedAvatar || currentAvatar);

  const handleSelect = (avatarSrc: string) => {
    setSelected(avatarSrc);
    if (onSelect) onSelect(avatarSrc);
    if (onSelectAvatar) onSelectAvatar(avatarSrc);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-2">
        <Avatar className="h-24 w-24">
          <AvatarImage src={selected} alt="Selected avatar" />
          <AvatarFallback>?</AvatarFallback>
        </Avatar>
        <p className="text-sm text-muted-foreground">Selected Avatar</p>
      </div>

      <ScrollArea className="h-[220px] rounded-md border p-4">
        <div className="grid grid-cols-4 gap-4">
          {avatars.map((avatar) => (
            <button
              key={avatar.id}
              className={`relative rounded-md p-1 ${
                selected === avatar.src
                  ? "ring-2 ring-primary"
                  : "hover:bg-accent"
              }`}
              onClick={() => handleSelect(avatar.src)}
            >
              <Avatar className="h-14 w-14">
                <AvatarImage src={avatar.src} alt={avatar.alt} />
                <AvatarFallback>?</AvatarFallback>
              </Avatar>
              {selected === avatar.src && (
                <div className="absolute -right-1 -top-1 rounded-full bg-primary p-1">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

// Add the static method to the component
AvatarSelector.getAvatarImageUrl = getAvatarImageUrl;

export default AvatarSelector;
