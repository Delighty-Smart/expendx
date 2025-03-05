
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AvatarUploader from "./AvatarUploader";
import { Loader2, PencilIcon, SaveIcon } from "lucide-react";

const CONTINENTS = ["Africa", "Antarctica", "Asia", "Europe", "North America", "Oceania", "South America"];
const AGE_BRACKETS = ["Under 18", "18-24", "25-34", "35-44", "45-54", "55-64", "65+", "Prefer not to say"];

const profileSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").optional(),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().optional(),
  bio: z.string().max(500, "Bio must be under 500 characters").optional(),
  age_bracket: z.string().optional(),
  continent: z.string().optional(),
  country: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  profile: any;
  setProfile: (profile: any) => void;
}

const ProfileForm = ({ profile, setProfile }: ProfileFormProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: profile?.username || "",
      first_name: profile?.first_name || "",
      last_name: profile?.last_name || "",
      bio: profile?.bio || "",
      age_bracket: profile?.age_bracket || "",
      continent: profile?.continent || "",
      country: profile?.country || "",
    },
  });

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      setIsSubmitting(true);
      
      const { error } = await supabase
        .from("user_profiles")
        .update(values)
        .eq("id", profile.id);

      if (error) throw error;

      // Update local state
      setProfile({ ...profile, ...values });
      
      toast({
        title: "Profile updated",
        description: "Your profile information has been updated successfully",
      });
      
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Update failed",
        description: "Failed to update profile information",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAvatarUpdate = async (url: string) => {
    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({ avatar_url: url })
        .eq("id", profile.id);

      if (error) throw error;

      // Update local state
      setProfile({ ...profile, avatar_url: url });
    } catch (error) {
      console.error("Error updating avatar:", error);
      toast({
        title: "Avatar update failed",
        description: "Failed to update avatar in database",
        variant: "destructive",
      });
    }
  };

  if (!profile) return null;

  return (
    <div className="space-y-6 animate-fadeIn">
      {!isEditing ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Your Profile</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 hover:bg-primary/10 hover:text-primary transition-all duration-300"
            >
              <PencilIcon className="h-4 w-4" />
              Edit Profile
            </Button>
          </div>
          
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <AvatarUploader 
              currentAvatarUrl={profile.avatar_url} 
              userId={profile.id}
              onAvatarUpdate={handleAvatarUpdate}
            />
            
            <div className="grid w-full gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Username</p>
                  <p className="text-foreground">{profile.username || "Not set"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Name</p>
                  <p className="text-foreground">
                    {profile.first_name ? `${profile.first_name} ${profile.last_name || ""}` : "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-foreground">{profile.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Age</p>
                  <p className="text-foreground">{profile.age_bracket || "Not set"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Location</p>
                  <p className="text-foreground">
                    {profile.continent ? `${profile.continent}${profile.country ? `, ${profile.country}` : ""}` : "Not set"}
                  </p>
                </div>
              </div>
              
              {profile.bio && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Bio</p>
                  <p className="text-foreground whitespace-pre-wrap">{profile.bio}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Edit Profile</h3>
              <Button 
                type="button"
                variant="ghost" 
                size="sm" 
                onClick={() => setIsEditing(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
            </div>
            
            <div className="flex flex-col md:flex-row gap-6">
              <AvatarUploader 
                currentAvatarUrl={profile.avatar_url} 
                userId={profile.id}
                onAvatarUpdate={handleAvatarUpdate}
              />
              
              <div className="grid w-full gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="Username" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="First Name" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Last Name" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="age_bracket"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Age Bracket</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an age bracket" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {AGE_BRACKETS.map((age) => (
                              <SelectItem key={age} value={age}>
                                {age}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="continent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Continent</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a continent" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CONTINENTS.map((continent) => (
                              <SelectItem key={continent} value={continent}>
                                {continent}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input placeholder="Country" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Tell us about yourself..." 
                          className="min-h-[100px]" 
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="gap-2 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 transition-all shadow-lg hover:shadow-primary/20"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                <SaveIcon className="h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
};

export default ProfileForm;
