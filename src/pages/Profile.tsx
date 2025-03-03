
import React, { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import ProfileTabs from "@/components/profile/ProfileTabs";
import { getUserProfile, updateUserStreak } from "@/lib/streak";
import { toast } from "sonner";

const Profile = () => {
  const [loading, setLoading] = useState(true);
  
  // Load user data and update streak when the page loads
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Update the user's streak count
        const streak = await updateUserStreak();
        if (!streak) {
          toast.error("Failed to update streak. Please try again later.");
        }
      } catch (error) {
        console.error("Error loading profile data:", error);
        toast.error("Failed to load profile data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Profile</h1>
        {loading ? (
          <div className="flex justify-center p-8">
            <p>Loading profile data...</p>
          </div>
        ) : (
          <ProfileTabs />
        )}
      </div>
    </Layout>
  );
};

export default Profile;
