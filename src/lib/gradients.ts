
export const PROFILE_GRADIENTS = [
    { id: "ocean", class: "bg-gradient-to-br from-blue-400 to-blue-600", label: "Ocean Blue" },
    { id: "sunset", class: "bg-gradient-to-br from-orange-400 to-rose-500", label: "Sunset" },
    { id: "nature", class: "bg-gradient-to-br from-emerald-400 to-teal-600", label: "Nature" },
    { id: "royal", class: "bg-gradient-to-br from-purple-500 to-indigo-600", label: "Royal Purple" },
    { id: "candy", class: "bg-gradient-to-br from-pink-400 to-purple-600", label: "Candy" },
    { id: "midnight", class: "bg-gradient-to-br from-slate-700 to-slate-900", label: "Midnight" },
    { id: "gold", class: "bg-gradient-to-br from-amber-300 to-yellow-500", label: "Gold" },
    { id: "sky", class: "bg-gradient-to-br from-sky-400 to-indigo-400", label: "Sky" },
    { id: "mint", class: "bg-gradient-to-br from-green-300 to-emerald-500", label: "Mint" },
    { id: "flamingo", class: "bg-gradient-to-br from-rose-400 to-pink-500", label: "Flamingo" },
    { id: "emerald", class: "bg-gradient-to-br from-emerald-500 to-teal-700", label: "Emerald" },
    { id: "cherry", class: "bg-gradient-to-br from-red-500 to-rose-700", label: "Cherry" },
];

export const isGradient = (url: string | null | undefined): boolean => {
    if (!url) return false;
    return url.startsWith('bg-gradient-to-');
};

export const getDefaultGradient = () => PROFILE_GRADIENTS[0].class;
