
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { isGradient, getDefaultGradient } from "@/lib/gradients";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
    url?: string | null;
    name?: string | null;
    className?: string;
    fallbackClassName?: string;
    showDefaultGradient?: boolean;
}

const UserAvatar = ({ url, name, className, fallbackClassName, showDefaultGradient = true }: UserAvatarProps) => {
    const avatarUrl = url || (showDefaultGradient ? getDefaultGradient() : null);
    const isGrad = isGradient(avatarUrl);

    const initials = name
        ? name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().substring(0, 2)
        : "";

    return (
        <Avatar className={cn(className, isGrad ? avatarUrl : "")}>
            {!isGrad && avatarUrl && (
                <AvatarImage
                    src={avatarUrl}
                    alt={name || "Avatar"}
                    className="object-cover"
                />
            )}
            <AvatarFallback className={cn("text-xs", isGrad ? "bg-transparent" : "bg-muted", fallbackClassName)}>
                {initials || <User className="h-4 w-4" />}
            </AvatarFallback>
        </Avatar>
    );
};

export default UserAvatar;
