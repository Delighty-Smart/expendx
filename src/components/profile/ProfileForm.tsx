import { useState } from "react";
import { useForm } from "react-hook-form";
import { Camera, Save, PencilLine, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ImageCropper from "./ImageCropper";

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
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [selectedContinent, setSelectedContinent] = useState(profile?.continent || "");
  const [cropperImage, setCropperImage] = useState<string>("");
  const [showCropper, setShowCropper] = useState(false);
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file.",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload an image smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }
      
      // Create preview URL and show cropper
      const previewUrl = URL.createObjectURL(file);
      setCropperImage(previewUrl);
      setShowCropper(true);
    } catch (error: any) {
      console.error("Error processing file:", error);
      toast({
        title: "Processing failed",
        description: "There was an error processing your image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    try {
      setUploadingAvatar(true);
      setShowCropper(false);
      
      // Upload the cropped file to Supabase Storage
      const fileExt = 'jpg'; // Always save as JPG after cropping
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedBlob);
      
      if (uploadError) throw uploadError;
      
      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      
      // Update the user profile with the new avatar URL
      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({
          avatar_url: publicUrl
        })
        .eq("id", profile.id);
      
      if (updateError) throw updateError;
      
      // Update local state
      setProfile({
        ...profile,
        avatar_url: publicUrl
      });
      
      toast({
        title: "Avatar updated",
        description: "Your avatar has been updated successfully.",
      });
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast({
        title: "Upload failed",
        description: error.message || "There was an error uploading your avatar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
      // Clean up the preview URL
      URL.revokeObjectURL(cropperImage);
      setCropperImage("");
    }
  };

  const handleCropperClose = () => {
    setShowCropper(false);
    URL.revokeObjectURL(cropperImage);
    setCropperImage("");
  };

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
        <div className="relative">
          <Avatar className="h-24 w-24 cursor-pointer border-2 border-primary/20">
            <AvatarImage 
              src={profile.avatar_url || '/placeholder.svg'} 
              alt="Avatar"
              className="object-cover"
            />
            <AvatarFallback className="text-xl">
              {profile.first_name?.[0]}{profile.last_name?.[0] || ''}
            </AvatarFallback>
          </Avatar>
          <div className="absolute bottom-0 right-0">
            <Label htmlFor="avatar-upload" className="cursor-pointer">
              <div className="bg-primary rounded-full p-2 text-primary-foreground shadow-lg">
                {uploadingAvatar ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
              </div>
            </Label>
            <Input 
              id="avatar-upload" 
              type="file"
              accept="image/*"
              className="hidden" 
              onChange={handleFileUpload}
              disabled={uploadingAvatar}
            />
          </div>
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
      
      <ImageCropper
        image={cropperImage}
        isOpen={showCropper}
        onClose={handleCropperClose}
        onCrop={handleCropComplete}
      />
    </div>
  );
};

export default ProfileForm;
