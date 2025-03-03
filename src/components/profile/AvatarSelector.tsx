
import { useState } from "react";
import { cn } from "@/lib/utils";

// Define avatar options
const AVATARS = [
  // People avatars
  "avatar-1.png",
  "avatar-2.png",
  "avatar-3.png",
  "avatar-4.png",
  "avatar-5.png",
  "avatar-6.png",
  "avatar-7.png",
  "avatar-8.png",
  "avatar-9.png",
  "avatar-10.png",
  // Animal avatars
  "avatar-cat-1.png",
  "avatar-cat-2.png",
  "avatar-dog-1.png",
  "avatar-dog-2.png",
  "avatar-fox.png",
  "avatar-owl.png",
  "avatar-panda.png",
  "avatar-penguin.png",
  "avatar-bear.png",
  "avatar-monkey.png",
];

// Create a mapping of actual image paths using the uploaded images
const AVATAR_IMAGES: Record<string, string> = {
  "avatar-1.png": "/lovable-uploads/c2a2d26c-0523-4fb9-9813-51aac4bc3987.png",
  "avatar-2.png": "/lovable-uploads/23786936-39a8-4e94-9eb3-3464ed7ffc82.png",
  "avatar-3.png": "/lovable-uploads/2bcde0f4-1483-4e84-a8e4-0227c5bdc9e8.png",
  "avatar-4.png": "/lovable-uploads/167baf60-e95c-4360-a687-d246ef45f33e.png",
  // For the other avatars, we'll use placeholders until more images are available
  "avatar-5.png": "https://api.dicebear.com/7.x/personas/svg?seed=Felix&backgroundColor=ffdfbf,ffd5dc,d1d4f9,c0aede,b6e3f4",
  "avatar-6.png": "https://api.dicebear.com/7.x/personas/svg?seed=Lily&backgroundColor=ffdfbf,ffd5dc,d1d4f9,c0aede,b6e3f4",
  "avatar-7.png": "https://api.dicebear.com/7.x/personas/svg?seed=Max&backgroundColor=ffdfbf,ffd5dc,d1d4f9,c0aede,b6e3f4",
  "avatar-8.png": "https://api.dicebear.com/7.x/personas/svg?seed=Sophie&backgroundColor=ffdfbf,ffd5dc,d1d4f9,c0aede,b6e3f4",
  "avatar-9.png": "https://api.dicebear.com/7.x/personas/svg?seed=Oliver&backgroundColor=ffdfbf,ffd5dc,d1d4f9,c0aede,b6e3f4",
  "avatar-10.png": "https://api.dicebear.com/7.x/personas/svg?seed=Emma&backgroundColor=ffdfbf,ffd5dc,d1d4f9,c0aede,b6e3f4",
  // Animal avatars
  "avatar-cat-1.png": "https://api.dicebear.com/7.x/bottts/svg?seed=Cat1&backgroundColor=ffdfbf,ffd5dc,d1d4f9,c0aede,b6e3f4",
  "avatar-cat-2.png": "https://api.dicebear.com/7.x/bottts/svg?seed=Cat2&backgroundColor=ffdfbf,ffd5dc,d1d4f9,c0aede,b6e3f4",
  "avatar-dog-1.png": "https://api.dicebear.com/7.x/bottts/svg?seed=Dog1&backgroundColor=ffdfbf,ffd5dc,d1d4f9,c0aede,b6e3f4",
  "avatar-dog-2.png": "https://api.dicebear.com/7.x/bottts/svg?seed=Dog2&backgroundColor=ffdfbf,ffd5dc,d1d4f9,c0aede,b6e3f4",
  "avatar-fox.png": "https://api.dicebear.com/7.x/bottts/svg?seed=Fox&backgroundColor=ffdfbf,ffd5dc,d1d4f9,c0aede,b6e3f4",
  "avatar-owl.png": "https://api.dicebear.com/7.x/bottts/svg?seed=Owl&backgroundColor=ffdfbf,ffd5dc,d1d4f9,c0aede,b6e3f4",
  "avatar-panda.png": "https://api.dicebear.com/7.x/bottts/svg?seed=Panda&backgroundColor=ffdfbf,ffd5dc,d1d4f9,c0aede,b6e3f4",
  "avatar-penguin.png": "https://api.dicebear.com/7.x/bottts/svg?seed=Penguin&backgroundColor=ffdfbf,ffd5dc,d1d4f9,c0aede,b6e3f4",
  "avatar-bear.png": "https://api.dicebear.com/7.x/bottts/svg?seed=Bear&backgroundColor=ffdfbf,ffd5dc,d1d4f9,c0aede,b6e3f4",
  "avatar-monkey.png": "https://api.dicebear.com/7.x/bottts/svg?seed=Monkey&backgroundColor=ffdfbf,ffd5dc,d1d4f9,c0aede,b6e3f4",
};

// Get the image URL for an avatar key
const getAvatarUrl = (key: string): string => {
  return AVATAR_IMAGES[key] || "/placeholder.svg";
};

interface AvatarSelectorProps {
  selectedAvatar: string;
  onChange: (avatar: string) => void;
}

const AvatarSelector = ({ selectedAvatar, onChange }: AvatarSelectorProps) => {
  // For pagination if there are many avatars
  const [currentPage, setCurrentPage] = useState(0);
  const AVATARS_PER_PAGE = 8;
  
  const totalPages = Math.ceil(AVATARS.length / AVATARS_PER_PAGE);
  const displayedAvatars = AVATARS.slice(
    currentPage * AVATARS_PER_PAGE,
    (currentPage + 1) * AVATARS_PER_PAGE
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2">
        {displayedAvatars.map((avatar) => (
          <div
            key={avatar}
            className={cn(
              "p-1 cursor-pointer rounded-md border-2 hover:bg-accent/50",
              selectedAvatar === avatar
                ? "border-primary"
                : "border-transparent"
            )}
            onClick={() => onChange(avatar)}
          >
            <img
              src={getAvatarUrl(avatar)}
              alt={`Avatar ${avatar}`}
              className="w-full aspect-square rounded-full object-cover"
            />
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
            disabled={currentPage === 0}
            className="px-2 py-1 text-sm rounded bg-accent disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-2 py-1 text-sm">
            {currentPage + 1} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))}
            disabled={currentPage === totalPages - 1}
            className="px-2 py-1 text-sm rounded bg-accent disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default AvatarSelector;
