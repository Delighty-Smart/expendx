
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProfileForm from "@/components/profile/ProfileForm";
import CommunityTab from "@/components/profile/CommunityTab";
import StreakProgress from "@/components/profile/StreakProgress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles } from "lucide-react";

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

        // Get user profile
        const { data: profileData, error: profileError } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileError) throw profileError;
        
        // Get user streak
        const { data: streakData, error: streakError } = await supabase
          .from("user_streaks")
          .select("*")
          .eq("user_id", user.id)
          .single();
          
        if (streakError) throw streakError;

        setUserProfile(profileData);
        setUserStreak(streakData);
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

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            Your Profile
            <Sparkles className="h-5 w-5 text-amber-400" />
          </h1>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading profile...</div>
          </div>
        ) : (
          <Tabs defaultValue="you" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="you" className="animated-button">You</TabsTrigger>
              <TabsTrigger value="community" className="animated-button">Community</TabsTrigger>
            </TabsList>

            <TabsContent value="you" className="space-y-8 animate-fadeIn">
              {userStreak && (
                <StreakProgress streak={userStreak} />
              )}

              <Card className="border-primary/20 shadow-lg hover:shadow-primary/10 transition-all duration-300">
                <CardContent className="pt-6">
                  <ProfileForm 
                    profile={userProfile} 
                    setProfile={setUserProfile} 
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="community" className="animate-fadeIn">
              <CommunityTab profile={userProfile} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </Layout>
  );
};

export default Profile;
