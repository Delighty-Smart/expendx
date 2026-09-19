import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { X, Megaphone, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { cn } from "@/lib/utils";

type Banner = {
    id: string;
    title: string;
    type: 'banner' | 'popup';
    content_type: 'text' | 'image' | 'mixed';
    message: string | null;
    image_url: string | null;
    cta_text: string | null;
    cta_link: string | null;
    is_active: boolean;
    created_at: string;
    start_date: string | null;
    end_date: string | null;
};

const GlobalBanner = () => {
    const [activeBanner, setActiveBanner] = useState<Banner | null>(null);
    const [activePopup, setActivePopup] = useState<Banner | null>(null);
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [bannerVisible, setBannerVisible] = useState(false);
    const location = useLocation();

    useEffect(() => {
        fetchActiveBanners();
    }, [location.pathname]);

    const fetchActiveBanners = async () => {
        try {
            const q = query(
                collection(db, 'admin_banners'),
                where('is_active', '==', true)
            );
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as unknown as Banner[];

            if (data && data.length > 0) {
                const now = new Date();
                const filtered = data.filter(b => {
                    const startDateOk = !b.start_date || new Date(b.start_date) <= now;
                    const endDateOk = !b.end_date || new Date(b.end_date) >= now;
                    return startDateOk && endDateOk;
                });

                const banners = filtered.filter(b => b.type === 'banner').sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                const popups = filtered.filter(b => b.type === 'popup').sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                if (banners.length > 0) {
                    const banner = banners[0];
                    const dismissed = sessionStorage.getItem(`dismissed_banner_${banner.id}`);
                    if (!dismissed) {
                        setActiveBanner(banner);
                        setBannerVisible(true);
                    }
                }

                if (popups.length > 0) {
                    const popup = popups[0];
                    const dismissed = localStorage.getItem(`dismissed_popup_${popup.id}`);
                    if (!dismissed) {
                        setActivePopup(popup);
                        setIsPopupOpen(true);
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching global banners:", error);
        }
    };

    const dismissBanner = () => {
        if (activeBanner) {
            setBannerVisible(false);
            sessionStorage.setItem(`dismissed_banner_${activeBanner.id}`, 'true');
        }
    };

    const dismissPopup = () => {
        if (activePopup) {
            setIsPopupOpen(false);
            localStorage.setItem(`dismissed_popup_${activePopup.id}`, 'true');
        }
    };

    if (!bannerVisible && !isPopupOpen) return null;

    return (
        <>
            {/* Top Banner */}
            {bannerVisible && activeBanner && (
                <div className="relative bg-primary text-primary-foreground px-4 py-3 shadow-md z-50 animate-in slide-in-from-top duration-300">
                    <div className="container mx-auto flex items-center justify-between gap-4 text-sm font-medium">
                        <div className="flex items-center gap-2 flex-1 overflow-hidden">
                            <Megaphone className="h-4 w-4 shrink-0 animate-bounce" />
                            <div className="flex items-center gap-2 truncate">
                                {activeBanner.message && <span>{activeBanner.message}</span>}
                                {activeBanner.cta_text && activeBanner.cta_link && (
                                    <a
                                        href={activeBanner.cta_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="underline decoration-wavy underline-offset-4 hover:text-white/90"
                                    >
                                        {activeBanner.cta_text}
                                    </a>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={dismissBanner}
                            className="rounded-full p-1 hover:bg-primary-foreground/10 transition-colors"
                        >
                            <X className="h-4 w-4" />
                            <span className="sr-only">Dismiss</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Popup Modal */}
            {activePopup && (
                <Dialog open={isPopupOpen} onOpenChange={(open) => !open && dismissPopup()}>
                    <DialogContent className="sm:max-w-md overflow-hidden p-0 gap-0">
                        {activePopup.image_url && (
                            <div className="w-full h-48 sm:h-56 relative bg-muted">
                                <img
                                    src={activePopup.image_url}
                                    alt={activePopup.title}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        )}

                        <DialogHeader className="p-6 pb-2">
                            <DialogTitle className="text-xl flex items-center gap-2">
                                {!activePopup.image_url && <Megaphone className="h-5 w-5 text-primary" />}
                                {activePopup.title}
                            </DialogTitle>
                            {activePopup.message && (
                                <DialogDescription className="pt-2 text-base text-foreground/80">
                                    {activePopup.message}
                                </DialogDescription>
                            )}
                        </DialogHeader>

                        <DialogFooter className="p-6 pt-4 flex-col sm:flex-row gap-2">
                            <Button variant="ghost" onClick={dismissPopup} className="sm:flex-1">
                                Dismiss
                            </Button>
                            {activePopup.cta_text && activePopup.cta_link && (
                                <Button className="sm:flex-1" asChild>
                                    <a href={activePopup.cta_link} target="_blank" rel="noopener noreferrer">
                                        {activePopup.cta_text}
                                        <ExternalLink className="ml-2 h-4 w-4" />
                                    </a>
                                </Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
};

export default GlobalBanner;
