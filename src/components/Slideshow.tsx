
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface SlideshowProps {
  className?: string;
}

const Slideshow = ({ className }: SlideshowProps) => {
  const [banners, setBanners] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [autoplayEnabled, setAutoplayEnabled] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRoleAndBanners = async () => {
      try {
        setLoading(true);

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setLoading(false);
          return;
        }

        // Get user role
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;
        
        setUserRole(profileData?.role || 'free');

        // Get banners for this user's role
        const { data: bannerData, error: bannerError } = await supabase
          .from('slideshow_banners')
          .select('*')
          .eq('active', true)
          .order('display_order', { ascending: true });

        if (bannerError) throw bannerError;
        
        // Filter banners by role
        const filteredBanners = bannerData?.filter(banner => 
          banner.visible_to.includes(profileData?.role || 'free')
        ) || [];
        
        setBanners(filteredBanners);
      } catch (error) {
        console.error('Error fetching banners:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRoleAndBanners();
  }, []);

  useEffect(() => {
    if (!autoplayEnabled || banners.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex(prevIndex => 
        prevIndex === banners.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000);
    
    return () => clearInterval(interval);
  }, [banners.length, autoplayEnabled]);

  const handleNext = () => {
    setCurrentIndex(prevIndex => 
      prevIndex === banners.length - 1 ? 0 : prevIndex + 1
    );
    setAutoplayEnabled(false);
  };

  const handlePrev = () => {
    setCurrentIndex(prevIndex => 
      prevIndex === 0 ? banners.length - 1 : prevIndex - 1
    );
    setAutoplayEnabled(false);
  };

  if (loading) {
    return (
      <Card className={cn("relative h-48 overflow-hidden bg-muted animate-pulse", className)}>
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          Loading...
        </div>
      </Card>
    );
  }

  if (banners.length === 0) {
    return null;
  }

  return (
    <Card className={cn("relative h-[240px] overflow-hidden", className)}>
      <div 
        className="absolute inset-0 flex transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {banners.map((banner, index) => (
          <div key={banner.id} className="w-full h-full flex-shrink-0 relative">
            <img 
              src={banner.image_url}
              alt={banner.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-6">
              <h3 className="text-white text-xl font-bold">{banner.title}</h3>
              {banner.description && (
                <p className="text-white/90 mt-1">{banner.description}</p>
              )}
              {banner.link_url && (
                <a 
                  href={banner.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block"
                >
                  <Button variant="outline" size="sm">
                    Learn More
                  </Button>
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {banners.length > 1 && (
        <>
          <Button
            size="icon"
            variant="outline"
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
            onClick={handlePrev}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
            onClick={handleNext}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
          
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-1">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentIndex(index);
                  setAutoplayEnabled(false);
                }}
                className={`w-2 h-2 rounded-full ${
                  index === currentIndex 
                    ? 'bg-white' 
                    : 'bg-white/50 hover:bg-white/80'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </Card>
  );
};

export default Slideshow;
