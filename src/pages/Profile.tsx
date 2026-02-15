
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProfileForm from "@/components/profile/ProfileForm";
import StreakProgress from "@/components/profile/StreakProgress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { updateUserStreak } from "@/lib/streak";

const Profile = () => {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userStreak, setUserStreak] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        console.log("Profile page: fetchUserData called");

        // Timeout for session retrieval
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Profile data fetch timed out')), 10000);
        });

        // Get current user
        const userPromise = supabase.auth.getUser();
        const { data: { user }, error: authError } = await (Promise.race([userPromise, timeoutPromise]) as any);

        if (authError || !user) {
          console.log("No user in Profile page, redirecting to auth: ", authError);
          navigate("/auth");
          return;
        }

        console.log("Current user for profile:", user.id);

        // Get user profile
        const profileQuery = supabase
          .from("user_profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        let { data: profileData, error: profileError } = await (Promise.race([profileQuery, timeoutPromise]) as any);

        console.log("Profile data response:", { data: profileData, error: profileError });

        // If profile doesn't exist, create one
        if (!profileData && (profileError?.code === 'PGRST116' || profileError?.message?.includes("no rows"))) {
          console.log("Creating new profile for user");
          const createProfilePromise = supabase
            .from("user_profiles")
            .insert({
              id: user.id,
              email: user.email,
              username: user.email?.split('@')[0] || 'user'
            })
            .select()
            .single();

          const { data: newProfile, error: createError } = await (Promise.race([createProfilePromise, timeoutPromise]) as any);

          if (createError) {
            console.error("Error creating profile:", createError);
            throw createError;
          }
          console.log("New profile created:", newProfile);
          profileData = newProfile;
        } else if (profileError) {
          console.error("Profile query error:", profileError);
          // Don't throw here, try to continue with streak
        }

        // Update user streak (also creates if it doesn't exist) - This function already has timeouts
        const updatedStreak = await updateUserStreak();
        console.log("Updated streak in profile:", updatedStreak);

        if (updatedStreak) {
          setUserStreak(updatedStreak);
        } else {
          // Fallback to fetching streak directly
          const streakQuery = supabase
            .from("user_streaks")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

          let { data: streakData, error: streakError } = await (Promise.race([streakQuery, timeoutPromise]) as any);

          console.log("Streak data response:", { data: streakData, error: streakError });

          if (!streakData) {
            console.log("Streak missing, creating defaults");
            // We'll let updateUserStreak handle creation eventually, but set local state for now
            setUserStreak({
              current_streak: 1,
              highest_streak: 1,
              current_title: "Budget Beginner",
              freeze_count: 3,
              last_login: new Date().toISOString()
            });
          } else {
            setUserStreak(streakData);
          }
        }

        setUserProfile(profileData || {
          id: user.id,
          email: user.email,
          username: user.email?.split('@')[0] || 'user'
        });

        // Success notification
        if (profileData) {
          toast({
            title: "Profile loaded",
            description: `Welcome back, ${profileData?.username || 'user'}!`,
          });
        }
      } catch (error: any) {
        console.error("Error in Profile.tsx fetchUserData:", error);
        toast({
          title: "Partial load",
          description: "Some profile data couldn't be retrieved from the server.",
          variant: "default",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate, toast]);

  // Render empty profile as fallback if data fetch failed but we're not in loading state
  if (!loading && (!userProfile || !userStreak)) {
    return (
      <Layout>
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
      </Layout>
    );
  }

  return (
    <Layout>
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
    </Layout>
  );
};

export default Profile;
