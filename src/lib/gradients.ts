export const PROFILE_AVATARS = [
    { id: "avatar_1", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&skinColor=614335&mouth=smile&eyes=default&eyebrows=default", label: "Felix" },
    { id: "avatar_2", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&skinColor=ae5d29&mouth=default&eyes=default&eyebrows=default", label: "Aneka" },
    { id: "avatar_3", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jack&skinColor=614335&mouth=smile&eyes=happy&eyebrows=default", label: "Jack" },
    { id: "avatar_4", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mimi&skinColor=ae5d29&mouth=default&eyes=default&eyebrows=default", label: "Mimi" },
    { id: "avatar_5", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Harley&skinColor=614335&mouth=smile&eyes=default&eyebrows=default", label: "Harley" },
    { id: "avatar_6", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver&skinColor=ae5d29&mouth=default&eyes=default&eyebrows=default", label: "Oliver" },
    { id: "avatar_7", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe&skinColor=614335&mouth=smile&eyes=happy&eyebrows=default", label: "Zoe" },
    { id: "avatar_8", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Leo&skinColor=ae5d29&mouth=default&eyes=default&eyebrows=default", label: "Leo" },
    { id: "avatar_9", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mia&skinColor=614335&mouth=smile&eyes=default&eyebrows=default", label: "Mia" },
    { id: "avatar_10", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Buster&skinColor=ae5d29&mouth=default&eyes=default&eyebrows=default", label: "Buster" },
    { id: "avatar_11", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia&skinColor=614335&mouth=smile&eyes=happy&eyebrows=default", label: "Sophia" },
    { id: "avatar_12", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Max&skinColor=ae5d29&mouth=default&eyes=default&eyebrows=default", label: "Max" },
];

export const isGradient = (url: string | null | undefined): boolean => {
    if (!url) return false;
    return url.startsWith('bg-gradient-to-');
};

export const getDefaultGradient = () => PROFILE_AVATARS[0].url;
