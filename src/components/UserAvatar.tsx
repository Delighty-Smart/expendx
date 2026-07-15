
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
            <AvatarFallback className={cn(
                "text-xs font-bold shadow-inner font-sans tracking-tight",
                isGrad 
                    ? "bg-transparent text-foreground" 
                    : "bg-gradient-to-b from-zinc-100 to-zinc-250 dark:from-zinc-800 dark:to-zinc-900 border border-zinc-200/50 dark:border-zinc-700/40 text-zinc-700 dark:text-zinc-300", 
                fallbackClassName
            )}>
                {initials || <User className="h-4 w-4 stroke-[1.5]" />}
            </AvatarFallback>
        </Avatar>
    );
};

export default UserAvatar;
