import { useState } from "react";
import { useForm } from "react-hook-form";
import { Save, Check, Settings2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PROFILE_GRADIENTS } from "@/lib/gradients";
import UserAvatar from "@/components/UserAvatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

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

const ProfileForm = ({ profile, setProfile }: { profile: any; setProfile: (profile: any) => void }) => {
  const { refreshProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingGradient, setUpdatingGradient] = useState(false);
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
      // Refresh global profile state
      await refreshProfile();

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

  const handleGradientSelect = async (gradientClass: string) => {
    try {
      setUpdatingGradient(true);

      const { error } = await supabase
        .from("user_profiles")
        .update({
          avatar_url: gradientClass
        })
        .eq("id", profile.id);

      if (error) throw error;

      // Update local state
      setProfile({
        ...profile,
        avatar_url: gradientClass
      });

      // Refresh global profile state
      await refreshProfile();

      toast({
        title: "Profile style updated",
        description: "Your new profile gradient has been saved.",
      });
    } catch (error: any) {
      console.error("Error updating gradient:", error);
      toast({
        title: "Update failed",
        description: error.message || "There was an error updating your profile style.",
        variant: "destructive",
      });
    } finally {
      setUpdatingGradient(false);
    }
  };

  if (!profile) return null;

  const displayName = profile.first_name ? `${profile.first_name} ${profile.last_name || ''} ` : profile.username || profile.email;

  return (
    <div className="space-y-8 relative">
      <div className="absolute top-0 right-0 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsEditing(!isEditing)}
          className={cn(
            "rounded-full transition-all duration-300",
            isEditing ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" : "bg-primary/10 text-primary hover:bg-primary/20"
          )}
        >
          {isEditing ? <X className="h-5 w-5" /> : <Settings2 className="h-5 w-5" />}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
        <UserAvatar
          url={profile.avatar_url}
          name={displayName}
          className="h-24 w-24 border-2 border-primary/20 shadow-xl"
          fallbackClassName="text-2xl"
        />

        <div className="flex-1">
          <h2 className="text-xl font-semibold">
            {displayName}
          </h2>
          <p className="text-muted-foreground">{profile.email}</p>
        </div>
      </div>

      {isEditing && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-500 p-4 rounded-2xl bg-muted/20 border border-border/40">
          <div className="flex flex-col gap-1">
            <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/70">Choose Profile Style</Label>
            <p className="text-xs text-muted-foreground">Select a gradient that reflects your style</p>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
            {PROFILE_GRADIENTS.map((grad) => {
              const isSelected = profile.avatar_url === grad.class;
              return (
                <button
                  key={grad.id}
                  onClick={() => handleGradientSelect(grad.class)}
                  disabled={updatingGradient}
                  className={cn(
                    "relative h-12 w-12 rounded-full transition-all duration-300 hover:scale-110 active:scale-95 shadow-sm overflow-hidden",
                    grad.class,
                    isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105" : "hover:ring-2 hover:ring-primary/40 hover:ring-offset-1 hover:ring-offset-background"
                  )}
                  title={grad.label}
                >
                  {isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[1px]">
                      <Check className="h-5 w-5 text-white drop-shadow-md" strokeWidth={3} />
                    </div>
                  )}
                  {updatingGradient && isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isEditing ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                {...register("username")}
                placeholder="@username"
                className="bg-muted/30"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="age_bracket">Age Bracket</Label>
              <Select
                defaultValue={profile.age_bracket}
                onValueChange={value => setValue("age_bracket", value)}
              >
                <SelectTrigger id="age_bracket" className="bg-muted/30">
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
                className="bg-muted/30"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                {...register("last_name")}
                placeholder="Your last name"
                className="bg-muted/30"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="continent">Continent</Label>
              <Select
                defaultValue={profile.continent}
                onValueChange={value => setValue("continent", value)}
              >
                <SelectTrigger id="continent" className="bg-muted/30">
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
                <SelectTrigger id="country" className="bg-muted/30">
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
              placeholder="Tell us about yourself..."
              rows={4}
              className="bg-muted/30 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>
              Discard
            </Button>
            <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  Save Changes
                  <Save className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4 border-t border-border mt-8">
          <div className="space-y-6">
            {profile.username && (
              <div className="flex flex-col gap-1">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Username</h4>
                <p className="text-lg font-medium">{profile.username}</p>
              </div>
            )}

            {(profile.first_name || profile.last_name) && (
              <div className="flex flex-col gap-1">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Full Name</h4>
                <p className="text-lg font-medium">{`${profile.first_name || ''} ${profile.last_name || ''} `}</p>
              </div>
            )}

            {(profile.continent || profile.country) && (
              <div className="flex flex-col gap-1">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Location</h4>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-medium">{[profile.country, profile.continent].filter(Boolean).join(', ')}</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bio</h4>
            {profile.bio ? (
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line italic">
                "{profile.bio}"
              </p>
            ) : (
              <p className="text-muted-foreground italic">No bio added yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileForm;
