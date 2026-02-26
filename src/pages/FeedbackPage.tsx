import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Send, ThumbsUp, ThumbsDown, MessageCircle, AlertCircle, Sparkles, Heart, Zap, Bug, MessageSquare } from "lucide-react";
import FeedbackSuccess from "@/components/FeedbackSuccess";

const ratingOptions = [
  {
    value: "positive",
    icon: Sparkles,
    label: "Love it!",
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
    border: "border-yellow-400/30",
    glow: "shadow-yellow-400/20"
  },
  {
    value: "neutral",
    icon: MessageCircle,
    label: "It's okay",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/30",
    glow: "shadow-blue-400/20"
  },
  {
    value: "negative",
    icon: ThumbsDown,
    label: "I'm frustrated",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    border: "border-orange-400/30",
    glow: "shadow-orange-400/20"
  },
  {
    value: "bug",
    icon: Bug,
    label: "Found a bug",
    color: "text-red-400",
    bg: "bg-red-400/10",
    border: "border-red-400/30",
    glow: "shadow-red-400/20"
  },
];

const FeedbackPage = () => {
  const [selectedRating, setSelectedRating] = useState<string | null>(null);
  const [comments, setComments] = useState("");
  const [contactPermission, setContactPermission] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Feedback | ExpendX";
  }, []);

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

      const { error } = await supabase
        .from('user_feedback')
        .insert({
          user_id: user.id,
          rating: selectedRating,
          comments: comments.trim() || null,
          contact_permission: contactPermission,
          screenshot_url: null
        });

      if (error) throw error;
      setIsSuccess(true);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Submission failed",
        description: "There was an error submitting your feedback",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <FeedbackSuccess onClose={() => {
        setIsSuccess(false);
        navigate("/");
      }} />
    );
  }

  return (
    <main className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl transform transition-all duration-500 animate-fadeIn">
        {/* Header Section */}
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-wider uppercase animate-float">
            <Zap className="h-3 w-3" />
            Help us grow
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent">
            Share your thoughts
          </h1>
          <p className="text-lg text-muted-foreground font-medium max-w-md mx-auto">
            Your feedback is the fuel that drives expendX forward.
          </p>
        </div>

        {/* Feedback Form Card */}
        <div className="glass-card rounded-[2.5rem] p-8 md:p-12 border border-white/10 shadow-2xl relative overflow-hidden group">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-[80px] group-hover:bg-primary/20 transition-all duration-700" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-[80px] group-hover:bg-blue-500/20 transition-all duration-700" />

          <form onSubmit={handleSubmit} className="space-y-10 relative z-10">
            {/* Rating Section */}
            <div className="space-y-6">
              <Label className="text-xl font-semibold text-center block text-foreground/90">
                How was your experience today?
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {ratingOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedRating(option.value)}
                    className={`relative flex flex-col items-center gap-4 p-6 rounded-lg border-2 transition-all duration-500 group/btn overflow-hidden ${selectedRating === option.value
                      ? `${option.border} ${option.bg} scale-[1.05] ${option.glow} shadow-xl`
                      : "border-transparent bg-muted/20 hover:bg-muted/40 hover:scale-[1.02]"
                      }`}
                  >
                    <option.icon className={`h-8 w-8 transition-all duration-500 ${selectedRating === option.value ? option.color : "text-muted-foreground group-hover/btn:scale-110"
                      }`} />
                    <span className={`text-sm font-bold tracking-tight transition-colors duration-500 ${selectedRating === option.value ? "text-foreground" : "text-muted-foreground"
                      }`}>
                      {option.label}
                    </span>
                    {selectedRating === option.value && (
                      <div className="absolute inset-x-0 bottom-0 h-1.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Comments Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="comments" className="text-lg font-semibold text-foreground/80">
                  Additional Context
                </Label>
                <span className="text-xs text-muted-foreground font-medium bg-muted/30 px-2 py-0.5 rounded-full">
                  Optional
                </span>
              </div>
              <div className="relative group">
                <Textarea
                  id="comments"
                  placeholder="Tell us what's on your mind... we're listening."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={4}
                  className="resize-none border-2 border-transparent bg-muted/20 focus-visible:ring-0 focus:border-primary/30 transition-all duration-300 rounded-[2rem] p-6 text-base leading-relaxed placeholder:text-muted-foreground/50 shadow-inner"
                />
                <div className="absolute bottom-4 right-4 text-muted-foreground/30 group-focus-within:text-primary/30 transition-colors">
                  <MessageSquare className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* Footer Section */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-6 border-t border-white/5">
              <div className="flex items-center space-x-4 group/check cursor-pointer" onClick={() => setContactPermission(!contactPermission)}>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${contactPermission ? "bg-primary border-primary" : "border-muted-foreground/30 bg-muted/20"
                  }`}>
                  {contactPermission && <Zap className="h-3 w-3 text-primary-foreground fill-current" />}
                </div>
                <Label className="text-sm font-medium text-muted-foreground group-hover/check:text-foreground transition-colors cursor-pointer">
                  Willing to discuss this further
                </Label>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || !selectedRating}
                className={`relative h-16 px-10 rounded-full font-bold text-lg transition-all duration-500 group overflow-hidden ${!selectedRating || isSubmitting
                  ? "bg-muted/50 text-muted-foreground"
                  : "bg-primary text-primary-foreground shadow-2xl hover:shadow-primary/40 hover:scale-[1.05]"
                  }`}
              >
                <div className="relative z-10 flex items-center gap-3">
                  {isSubmitting ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-3 border-current border-t-transparent" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      <span>Send Feedback</span>
                    </>
                  )}
                </div>
                {selectedRating && !isSubmitting && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]" />
                )}
              </Button>
            </div>
          </form>
        </div>

        <p className="text-center mt-8 text-sm text-muted-foreground/60 font-medium">
          expendX team reviews every piece of feedback manually.
        </p>
      </div>
    </main>
  );
};

export default FeedbackPage;
