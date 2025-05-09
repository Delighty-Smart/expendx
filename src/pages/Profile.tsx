
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
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          navigate("/auth");
          return;
        }

        console.log("Current user:", user);

        // Get user profile
        let { data: profileData, error: profileError } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        console.log("Profile data response:", { data: profileData, error: profileError });

        // If profile doesn't exist, create one
        if (!profileData && (profileError?.code === 'PGRST116' || profileError?.message?.includes("no rows"))) {
          console.log("Creating new profile for user");
          const { data: newProfile, error: createError } = await supabase
            .from("user_profiles")
            .insert({
              id: user.id,
              email: user.email,
              username: user.email?.split('@')[0] || 'user'
            })
            .select()
            .single();
            
          if (createError) {
            console.error("Error creating profile:", createError);
            throw createError;
          }
          console.log("New profile created:", newProfile);
          profileData = newProfile;
        } else if (profileError && !profileError.message?.includes("no rows")) {
          console.error("Profile error:", profileError);
          throw profileError;
        }
        
        // Update user streak (also creates if it doesn't exist)
        const updatedStreak = await updateUserStreak();
        console.log("Updated streak:", updatedStreak);
        
        if (updatedStreak) {
          setUserStreak(updatedStreak);
        } else {
          // Fallback to fetching streak directly
          let { data: streakData, error: streakError } = await supabase
            .from("user_streaks")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();
            
          console.log("Streak data response:", { data: streakData, error: streakError });
          
          // If streak doesn't exist, create one
          if (!streakData && (streakError?.code === 'PGRST116' || streakError?.message?.includes("no rows"))) {
            console.log("Creating new streak for user");
            const today = new Date();
            const { data: newStreak, error: createStreakError } = await supabase
              .from("user_streaks")
              .insert({
                user_id: user.id,
                current_streak: 1,
                highest_streak: 1,
                current_title: "Budget Beginner",
                freeze_count: 3,
                last_login: today.toISOString()
              })
              .select()
              .single();
              
            if (createStreakError) {
              console.error("Error creating streak:", createStreakError);
              throw createStreakError;
            }
            console.log("New streak created:", newStreak);
            streakData = newStreak;
          } else if (streakError && !streakError.message?.includes("no rows")) {
            console.error("Streak error:", streakError);
            throw streakError;
          }
          
          setUserStreak(streakData);
        }

        setUserProfile(profileData);
        
        // Success notification
        toast({
          title: "Profile loaded",
          description: `Welcome back, ${profileData?.username || 'user'}!`,
        });
      } catch (error: any) {
        console.error("Error fetching user data:", error);
        toast({
          title: "Error",
          description: "Failed to load profile data. Please try again.",
          variant: "destructive",
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
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading profile...</div>
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
