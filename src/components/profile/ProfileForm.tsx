
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Camera, Save, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const AGE_BRACKETS = [
  "18-24", "25-34", "35-44", "45-54", "55-64", "65+"
];

const CONTINENTS = [
  "Africa", "Asia", "Europe", "North America", "South America", "Oceania", "Antarctica"
];

// Common countries for each continent
const COUNTRIES_BY_CONTINENT: Record<string, string[]> = {
  "Africa": ["Nigeria", "South Africa", "Kenya", "Egypt", "Ghana", "Ethiopia"],
  "Asia": ["China", "India", "Japan", "South Korea", "Singapore", "Indonesia"],
  "Europe": ["United Kingdom", "Germany", "France", "Italy", "Spain", "Netherlands"],
  "North America": ["United States", "Canada", "Mexico"],
  "South America": ["Brazil", "Argentina", "Colombia", "Chile", "Peru"],
  "Oceania": ["Australia", "New Zealand", "Fiji"],
  "Antarctica": ["Research Stations"]
};

const AVATARS = Array.from({ length: 8 }, (_, i) => `avatar-${i + 1}.png`);

const ProfileForm = ({ profile, setProfile }: { profile: any; setProfile: (profile: any) => void }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [selectedContinent, setSelectedContinent] = useState(profile?.continent || "");
  const { toast } = useToast();
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      username: profile?.username || "",
      first_name: profile?.first_name || "",
      last_name: profile?.last_name || "",
      bio: profile?.bio || "",
      age_bracket: profile?.age_bracket || "",
      continent: profile?.continent || "",
      country: profile?.country || "",
    }
  });

  const watchContinent = watch("continent");
  
  if (watchContinent !== selectedContinent) {
    setSelectedContinent(watchContinent);
    setValue("country", "");
  }

  const onSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      
      const { error } = await supabase
        .from("user_profiles")
        .update({
          username: data.username,
          first_name: data.first_name,
          last_name: data.last_name,
          bio: data.bio,
          age_bracket: data.age_bracket,
          continent: data.continent,
          country: data.country,
        })
        .eq("id", profile.id);
      
      if (error) throw error;
      
      // Update local state
      setProfile({
        ...profile,
        username: data.username,
        first_name: data.first_name,
        last_name: data.last_name,
        bio: data.bio,
        age_bracket: data.age_bracket,
        continent: data.continent,
        country: data.country,
      });
      
      setIsEditing(false);
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        title: "Update failed",
        description: error.message || "There was an error updating your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSelectAvatar = async (avatar: string) => {
    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({
          avatar_url: avatar
        })
        .eq("id", profile.id);
      
      if (error) throw error;
      
      // Update local state
      setProfile({
        ...profile,
        avatar_url: avatar
      });
      
      setShowAvatarSelector(false);
      toast({
        title: "Avatar updated",
        description: "Your avatar has been updated successfully.",
      });
    } catch (error: any) {
      console.error("Error updating avatar:", error);
      toast({
        title: "Update failed",
        description: error.message || "There was an error updating your avatar. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
        <div className="relative">
          <Avatar className="h-24 w-24 cursor-pointer border-2 border-primary/20" onClick={() => setShowAvatarSelector(true)}>
            <AvatarImage src={`/lovable-uploads/${profile.avatar_url || 'avatar-1.png'}`} alt="Avatar" />
            <AvatarFallback className="text-xl">
              {profile.first_name?.[0]}{profile.last_name?.[0] || ''}
            </AvatarFallback>
          </Avatar>
          <Button 
            size="icon"
            variant="secondary" 
            className="absolute bottom-0 right-0 rounded-full h-8 w-8"
            onClick={() => setShowAvatarSelector(true)}
          >
            <Camera className="h-4 w-4" />
          </Button>
        </div>
        
        <div>
          <h2 className="text-xl font-semibold">
            {profile.first_name ? `${profile.first_name} ${profile.last_name || ''}` : profile.username || profile.email}
          </h2>
          <p className="text-muted-foreground">{profile.email}</p>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={() => setIsEditing(!isEditing)}
          >
            <PencilLine className="h-4 w-4 mr-1" />
            {isEditing ? "Cancel Editing" : "Edit Profile"}
          </Button>
        </div>
      </div>
      
      {showAvatarSelector && (
        <div className="bg-background border rounded-lg p-4 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Select Avatar</h3>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setShowAvatarSelector(false)}
            >
              Close
            </Button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {AVATARS.map((avatar) => (
              <Avatar 
                key={avatar} 
                className={`cursor-pointer h-16 w-16 transition-all ${
                  profile.avatar_url === avatar ? 'ring-2 ring-primary ring-offset-2' : 'hover:scale-105'
                }`}
                onClick={() => handleSelectAvatar(avatar)}
              >
                <AvatarImage src={`/lovable-uploads/${avatar}`} alt="Avatar option" />
              </Avatar>
            ))}
          </div>
        </div>
      )}
      
      {isEditing ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input 
                id="username"
                {...register("username")} 
                placeholder="Your username"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="age_bracket">Age Bracket</Label>
              <Select 
                defaultValue={profile.age_bracket} 
                onValueChange={value => setValue("age_bracket", value)}
              >
                <SelectTrigger id="age_bracket">
                  <SelectValue placeholder="Select age bracket" />
                </SelectTrigger>
                <SelectContent>
                  {AGE_BRACKETS.map(bracket => (
                    <SelectItem key={bracket} value={bracket}>{bracket}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input 
                id="first_name"
                {...register("first_name")} 
                placeholder="Your first name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input 
                id="last_name"
                {...register("last_name")} 
                placeholder="Your last name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="continent">Continent</Label>
              <Select 
                defaultValue={profile.continent} 
                onValueChange={value => setValue("continent", value)}
              >
                <SelectTrigger id="continent">
                  <SelectValue placeholder="Select continent" />
                </SelectTrigger>
                <SelectContent>
                  {CONTINENTS.map(continent => (
                    <SelectItem key={continent} value={continent}>{continent}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Select 
                defaultValue={profile.country} 
                onValueChange={value => setValue("country", value)}
                disabled={!selectedContinent}
              >
                <SelectTrigger id="country">
                  <SelectValue placeholder={selectedContinent ? "Select country" : "Select continent first"} />
                </SelectTrigger>
                <SelectContent>
                  {selectedContinent && 
                    COUNTRIES_BY_CONTINENT[selectedContinent]?.map(country => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea 
              id="bio"
              {...register("bio")} 
              placeholder="Tell us about yourself"
              rows={3}
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
              {!isSubmitting && <Save className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profile.username && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Username</h4>
                <p>{profile.username}</p>
              </div>
            )}
            
            {(profile.first_name || profile.last_name) && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Name</h4>
                <p>{`${profile.first_name || ''} ${profile.last_name || ''}`}</p>
              </div>
            )}
            
            {(profile.continent || profile.country) && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Location</h4>
                <p>{[profile.country, profile.continent].filter(Boolean).join(', ')}</p>
              </div>
            )}
          </div>
          
          {profile.bio && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Bio</h4>
              <p className="whitespace-pre-line">{profile.bio}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfileForm;
