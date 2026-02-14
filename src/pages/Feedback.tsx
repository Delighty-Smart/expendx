import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { GlassCard as Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Send, Upload, ThumbsUp, ThumbsDown, MessageCircle, AlertCircle } from "lucide-react";
import FeedbackSuccess from "@/components/FeedbackSuccess";

const ratingOptions = [
  { value: "positive", icon: ThumbsUp, label: "Positive" },
  { value: "neutral", icon: MessageCircle, label: "Neutral" },
  { value: "negative", icon: ThumbsDown, label: "Negative" },
  { value: "bug", icon: AlertCircle, label: "Bug Report" },
];

const FeedbackPage = () => {
  const [selectedRating, setSelectedRating] = useState<string | null>(null);
  const [comments, setComments] = useState("");
  const [contactPermission, setContactPermission] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Feedback | ExpendX";
    const desc = "Share quick feedback to help improve ExpendX.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", desc);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setScreenshot(file);

      // Create a preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRatingSelect = (value: string) => {
    setSelectedRating(value);
  };

  const handleRemoveScreenshot = () => {
    setScreenshot(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
<<<<<<< HEAD

=======
    
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
    if (!selectedRating) {
      toast({
        title: "Rating required",
        description: "Please select a rating for your feedback",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmitting(true);
<<<<<<< HEAD

      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();

=======
      
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
      if (!user) {
        toast({
          title: "Authentication error",
          description: "You must be logged in to submit feedback",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }
<<<<<<< HEAD

      let screenshotUrl = null;

=======
      
      let screenshotUrl = null;
      
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
      // Upload screenshot if there is one
      if (screenshot) {
        try {
          // Upload the file to Supabase Storage
          const fileExt = screenshot.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}.${fileExt}`;
<<<<<<< HEAD

          const { error: uploadError, data } = await supabase.storage
            .from('feedback-images')
            .upload(fileName, screenshot);

          if (uploadError) throw uploadError;

=======
          
          const { error: uploadError, data } = await supabase.storage
            .from('feedback-images')
            .upload(fileName, screenshot);
          
          if (uploadError) throw uploadError;
          
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
          // Get the public URL
          const { data: { publicUrl } } = supabase.storage
            .from('feedback-images')
            .getPublicUrl(fileName);
<<<<<<< HEAD

=======
          
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
          screenshotUrl = publicUrl;
        } catch (uploadError) {
          console.error("Screenshot upload error:", uploadError);
          toast({
            title: "Upload failed",
            description: "There was an error uploading your screenshot, but your feedback will still be submitted.",
            variant: "destructive"
          });
        }
      }
<<<<<<< HEAD

=======
      
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
      // Save feedback to database
      const { error } = await supabase
        .from('user_feedback')
        .insert({
          user_id: user.id,
          rating: selectedRating,
          comments: comments.trim() || null,
          contact_permission: contactPermission,
          screenshot_url: screenshotUrl
        });
<<<<<<< HEAD

=======
      
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
      if (error) {
        console.error("Database insert error:", error);
        throw error;
      }
<<<<<<< HEAD

      // Show success state
      setIsSuccess(true);

=======
      
      // Show success state
      setIsSuccess(true);
      
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
      // Reset form
      setTimeout(() => {
        setSelectedRating(null);
        setComments("");
        setContactPermission(false);
        setScreenshot(null);
        setPreviewUrl(null);
        setIsSubmitting(false);
      }, 300);

    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Submission failed",
        description: "There was an error submitting your feedback. Please try again.",
        variant: "destructive"
      });
      setIsSubmitting(false);
    }
  };
<<<<<<< HEAD

=======
  
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
  if (isSuccess) {
    return (
      <Layout>
        <FeedbackSuccess onClose={() => {
          setIsSuccess(false);
          navigate("/");
        }} />
      </Layout>
    );
  }

  return (
    <Layout>
      <main className="container max-w-3xl animate-fade-in">
        <h1 className="text-2xl font-bold mb-6">Feedback</h1>
        <Card>
          <CardHeader>
            <CardTitle>Quick Feedback</CardTitle>
            <CardDescription>
              Takes less than 30 seconds.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Rating Selection */}
              <div className="space-y-2">
                <Label>How was it?</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {ratingOptions.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      onClick={() => handleRatingSelect(option.value)}
                      variant={selectedRating === option.value ? "default" : "outline"}
<<<<<<< HEAD
                      className={`h-auto py-4 px-4 flex flex-col items-center gap-3 rounded-xl transition-all duration-300 ${selectedRating === option.value ? 'scale-[1.02] shadow-md' : 'hover:scale-[1.02] hover:bg-muted/50'
                        }`}
                    >
                      <option.icon className={`h-6 w-6 ${selectedRating === option.value ? '' : 'text-muted-foreground'}`} />
                      <span className="font-medium">{option.label}</span>
=======
                      className="h-auto py-3 px-4 flex flex-col items-center gap-2 rounded-xl hover-scale"
                    >
                      <option.icon className="h-5 w-5" />
                      <span>{option.label}</span>
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
                    </Button>
                  ))}
                </div>
              </div>

              {/* Comments */}
              <div className="space-y-2">
                <Label htmlFor="comments">Comments (optional)</Label>
                <Textarea
                  id="comments"
                  placeholder="Anything to add?"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>

              {/* Screenshot Upload */}
              <div className="space-y-2">
                <Label>Screenshot (optional)</Label>
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Add image
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <span className="text-sm text-muted-foreground">
                    {screenshot ? screenshot.name : "None"}
                  </span>
                </div>

                {/* Preview */}
                {previewUrl && (
                  <div className="mt-4 relative">
                    <div className="relative rounded-md overflow-hidden border border-border">
                      <img
                        src={previewUrl}
                        alt="Screenshot preview"
                        className="max-h-40 w-auto object-contain"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={handleRemoveScreenshot}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Contact Permission with smaller checkbox */}
              <div className="flex items-start space-x-3">
<<<<<<< HEAD
                <Checkbox
=======
                <Checkbox 
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
                  id="contactPermission"
                  checked={contactPermission}
                  onCheckedChange={(checked) => setContactPermission(checked as boolean)}
                  size="sm"
                  className="mt-0.5"
                />
                <Label
                  htmlFor="contactPermission"
                  className="text-sm text-muted-foreground cursor-pointer leading-relaxed"
                >
                  You can contact me about this.
                </Label>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !selectedRating}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                    <span>Sending...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    <span>Send feedback</span>
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
<<<<<<< HEAD
      </main>
=======
        </main>
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
    </Layout>
  );
};

export default FeedbackPage;
