
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Image, Send, Upload, Check, ThumbsUp, ThumbsDown, MessageCircle, AlertCircle } from "lucide-react";
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
      
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication error",
          description: "You must be logged in to submit feedback",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }
      
      let screenshotUrl = null;
      
      // Upload screenshot if there is one
      if (screenshot) {
        try {
          // Upload the file to Supabase Storage
          const fileExt = screenshot.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}.${fileExt}`;
          
          const { error: uploadError, data } = await supabase.storage
            .from('feedback-images')
            .upload(fileName, screenshot);
          
          if (uploadError) throw uploadError;
          
          // Get the public URL
          const { data: { publicUrl } } = supabase.storage
            .from('feedback-images')
            .getPublicUrl(fileName);
          
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
      
      if (error) {
        console.error("Database insert error:", error);
        throw error;
      }
      
      // Show success state
      setIsSuccess(true);
      
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
      <div className="container max-w-3xl animate-fadeIn">
        <h1 className="text-2xl font-bold mb-6">Share Your Feedback</h1>
        <Card>
          <CardHeader>
            <CardTitle>We Value Your Input</CardTitle>
            <CardDescription>
              Help us improve ExpendX by sharing your thoughts, suggestions, or reporting issues.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Rating Selection */}
              <div className="space-y-2">
                <Label>How would you rate your experience?</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {ratingOptions.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      onClick={() => handleRatingSelect(option.value)}
                      variant={selectedRating === option.value ? "default" : "outline"}
                      className="h-auto py-3 px-4 flex flex-col items-center gap-2"
                    >
                      <option.icon className="h-5 w-5" />
                      <span>{option.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Comments */}
              <div className="space-y-2">
                <Label htmlFor="comments">Tell us more (optional)</Label>
                <Textarea
                  id="comments"
                  placeholder="Share any specific details, suggestions, or issues..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>

              {/* Screenshot Upload */}
              <div className="space-y-2">
                <Label>Attach a Screenshot (optional)</Label>
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Upload Image
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <span className="text-sm text-muted-foreground">
                    {screenshot ? screenshot.name : "No file selected"}
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
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={handleRemoveScreenshot}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Contact Permission */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="contactPermission"
                  checked={contactPermission}
                  onCheckedChange={(checked) => 
                    setContactPermission(checked === true)
                  }
                />
                <Label
                  htmlFor="contactPermission"
                  className="text-sm text-muted-foreground"
                >
                  ExpendX team may contact me about this feedback
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
                    <span>Submitting...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    <span>Submit Feedback</span>
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default FeedbackPage;
