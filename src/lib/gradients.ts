export const PROFILE_AVATARS = [
    { id: "avatar_1", url: "https://api.dicebear.com/10.x/glyphs/svg?seed=Felix", label: "Felix" },
    { id: "avatar_2", url: "https://api.dicebear.com/10.x/glyphs/svg?seed=Aneka", label: "Aneka" },
    { id: "avatar_3", url: "https://api.dicebear.com/10.x/glyphs/svg?seed=Jack", label: "Jack" },
    { id: "avatar_4", url: "https://api.dicebear.com/10.x/glyphs/svg?seed=Mimi", label: "Mimi" },
    { id: "avatar_5", url: "https://api.dicebear.com/10.x/glyphs/svg?seed=Harley", label: "Harley" },
    { id: "avatar_6", url: "https://api.dicebear.com/10.x/glyphs/svg?seed=Oliver", label: "Oliver" },
    { id: "avatar_7", url: "https://api.dicebear.com/10.x/glyphs/svg?seed=Zoe", label: "Zoe" },
    { id: "avatar_8", url: "https://api.dicebear.com/10.x/glyphs/svg?seed=Leo", label: "Leo" },
    { id: "avatar_9", url: "https://api.dicebear.com/10.x/glyphs/svg?seed=Mia", label: "Mia" },
    { id: "avatar_10", url: "https://api.dicebear.com/10.x/glyphs/svg?seed=Buster", label: "Buster" },
    { id: "avatar_11", url: "https://api.dicebear.com/10.x/glyphs/svg?seed=Sophia", label: "Sophia" },
    { id: "avatar_12", url: "https://api.dicebear.com/10.x/glyphs/svg?seed=Max", label: "Max" },
];

export const isGradient = (url: string | null | undefined): boolean => {
    if (!url) return false;
    return url.startsWith('bg-gradient-to-');
};

export const getDefaultGradient = () => PROFILE_AVATARS[0].url;
