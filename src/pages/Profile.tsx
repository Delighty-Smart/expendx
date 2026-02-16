
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProfileForm from "@/components/profile/ProfileForm";
import StreakProgress from "@/components/profile/StreakProgress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { updateUserStreak } from "@/lib/streak";
import { useAuth } from "@/hooks/useAuth";

const Profile = () => {
  const { user, profile, refreshProfile, isLoading: authLoading } = useAuth();
  const [userProfile, setUserProfile] = useState<any>(profile);
  const [userStreak, setUserStreak] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (profile) {
      setUserProfile(profile);
    }
  }, [profile]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (authLoading) return; // Wait for auth to initialize
        if (!user) {
          navigate("/auth");
          return;
        }

        // Fetch streak locally (profile is now handled globably but synced above)
        const updatedStreak = await updateUserStreak();
        if (updatedStreak) {
          setUserStreak(updatedStreak);
        } else {
          // Fallback
          const { data } = await supabase.from("user_streaks").select("*").eq("user_id", user.id).maybeSingle();
          setUserStreak(data || {
            current_streak: 1,
            highest_streak: 1,
            current_title: "Budget Beginner",
            freeze_count: 3,
            last_login: new Date().toISOString()
          });
        }
      } catch (error: any) {
        console.error("Error in Profile.tsx:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user, authLoading, navigate]);

  // Render empty profile as fallback if data fetch failed but we're not in loading state
  if (!loading && (!userProfile || !userStreak)) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Your Profile</h1>
        <Card>
          <CardHeader>
            <CardTitle>Error Loading Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              There was an error loading your profile information. Please try refreshing the page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Your Profile</h1>

      {loading ? (
        <div className="space-y-6 animate-skeleton-pulse">
          <div className="border rounded-lg">
            <div className="p-6 border-b">
              <div className="h-6 bg-muted rounded w-40"></div>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-24"></div>
                <div className="h-10 bg-muted rounded"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-20"></div>
                <div className="h-10 bg-muted rounded"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-16"></div>
                <div className="h-20 bg-muted rounded"></div>
              </div>
              <div className="h-10 bg-muted rounded w-24"></div>
            </div>
          </div>
          <div className="border rounded-lg p-6">
            <div className="space-y-4">
              <div className="h-6 bg-muted rounded w-32"></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-20"></div>
                  <div className="h-8 bg-muted rounded"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-24"></div>
                  <div className="h-8 bg-muted rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent>
              <ProfileForm
                profile={userProfile}
                setProfile={setUserProfile}
              />
            </CardContent>
          </Card>

          {userStreak && (
            <StreakProgress streak={userStreak} />
          )}
        </div>
      )}
    </div>
  );
};

export default Profile;
