
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

// Define our avatar options
const avatarOptions = [
  "avatar-1.png",
  "avatar-2.png",
  "avatar-3.png",
  "avatar-4.png",
  // Add more options as needed
];

interface AvatarSelectorProps {
  selectedAvatar: string;
  onSelectAvatar: (avatarUrl: string) => void;
}

const AvatarSelector = ({ selectedAvatar, onSelectAvatar }: AvatarSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempAvatar, setTempAvatar] = useState(selectedAvatar);
  
  // Helper function to map the avatar key to its image URL
  static getAvatarImageUrl(key: string): string {
    const avatarImages: Record<string, string> = {
      "avatar-1.png": "/lovable-uploads/c2a2d26c-0523-4fb9-9813-51aac4bc3987.png",
      "avatar-2.png": "/lovable-uploads/23786936-39a8-4e94-9eb3-3464ed7ffc82.png",
      "avatar-3.png": "/lovable-uploads/2bcde0f4-1483-4e84-a8e4-0227c5bdc9e8.png",
      "avatar-4.png": "/lovable-uploads/167baf60-e95c-4360-a687-d246ef45f33e.png",
      // Add more mappings as needed
    };
    
    return avatarImages[key] || 
      `https://api.dicebear.com/7.x/personas/svg?seed=${key}&backgroundColor=ffdfbf,ffd5dc,d1d4f9,c0aede,b6e3f4`;
  }
  
  const handleSelectAvatar = (avatarKey: string) => {
    setTempAvatar(avatarKey);
  };
  
  const handleConfirm = () => {
    onSelectAvatar(tempAvatar);
    setIsOpen(false);
  };
  
  return (
    <>
      <img 
        src={AvatarSelector.getAvatarImageUrl(selectedAvatar)} 
        alt="Profile avatar" 
        className="w-full h-full object-cover cursor-pointer"
        onClick={() => setIsOpen(true)}
      />
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Choose an Avatar</DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh]">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 p-4">
              {avatarOptions.map((avatar) => (
                <div 
                  key={avatar}
                  className={`
                    relative cursor-pointer rounded-full overflow-hidden
                    border-2 hover:border-primary
                    ${tempAvatar === avatar ? 'border-primary ring-2 ring-primary' : 'border-transparent'}
                  `}
                  onClick={() => handleSelectAvatar(avatar)}
                >
                  <img 
                    src={AvatarSelector.getAvatarImageUrl(avatar)} 
                    alt={`Avatar ${avatar}`}
                    className="w-full h-full object-cover aspect-square"
                  />
                </div>
              ))}
              
              {/* Placeholder for more avatars */}
              {Array.from({ length: 16 }).map((_, i) => {
                const seed = `user-avatar-${i + 1}`;
                return (
                  <div 
                    key={seed}
                    className={`
                      relative cursor-pointer rounded-full overflow-hidden
                      border-2 hover:border-primary
                      ${tempAvatar === seed ? 'border-primary ring-2 ring-primary' : 'border-transparent'}
                    `}
                    onClick={() => handleSelectAvatar(seed)}
                  >
                    <img 
                      src={`https://api.dicebear.com/7.x/personas/svg?seed=${seed}&backgroundColor=ffdfbf,ffd5dc,d1d4f9,c0aede,b6e3f4`} 
                      alt={`Generated Avatar ${i+1}`}
                      className="w-full h-full object-cover aspect-square"
                    />
                  </div>
                );
              })}
            </div>
          </ScrollArea>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm}>
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AvatarSelector;
