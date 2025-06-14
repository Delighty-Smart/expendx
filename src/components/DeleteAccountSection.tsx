
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type DeletionOption = "data-only" | "account-and-data" | null;
type FeedbackReason = "not-useful" | "privacy-concerns" | "different-tool" | "technical-issues" | "other";

const DeleteAccountSection = () => {
  const [selectedOption, setSelectedOption] = useState<DeletionOption>(null);
  const [confirmationText, setConfirmationText] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackReason, setFeedbackReason] = useState<FeedbackReason | "">("");
  const [otherReason, setOtherReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const isDeleteEnabled = confirmationText.toLowerCase() === "delete";

  const handleOptionSelect = (option: DeletionOption) => {
    setSelectedOption(option);
    setConfirmationText("");
  };

  const handleConfirmDelete = () => {
    if (!isDeleteEnabled || !selectedOption) return;
    setShowFeedback(true);
  };

  const handleKeepAccount = () => {
    // Cancel operation and return to dashboard
    setSelectedOption(null);
    setShowFeedback(false);
    setConfirmationText("");
    setFeedbackReason("");
    setOtherReason("");
    toast({
      title: "Operation cancelled",
      description: "Your account and data remain intact.",
    });
  };

  const clearUserData = async () => {
    if (!user) return;

    try {
      // Delete all user data from database
      const tables = [
        'transactions',
        'budget_categories', 
        'savings_goals',
        'user_categories',
        'user_settings',
        'notification_preferences',
        'user_streaks',
        'monthly_income_estimates',
        'alerts',
        'user_feedback'
      ];

      for (const table of tables) {
        await supabase.from(table).delete().eq('user_id', user.id);
      }

      // Clear local storage
      localStorage.clear();
      
      toast({
        title: "Data deleted successfully",
        description: "All your data has been cleared.",
      });
    } catch (error) {
      console.error("Error clearing user data:", error);
      throw error;
    }
  };

  const deleteAccount = async () => {
    if (!user) return;

    try {
      // First clear all user data
      await clearUserData();
      
      // Delete user profile
      await supabase.from('user_profiles').delete().eq('id', user.id);
      
      // Sign out and redirect to auth
      await signOut();
      navigate('/auth');
      
      toast({
        title: "Account deleted",
        description: "Your account and all data have been permanently deleted.",
      });
    } catch (error) {
      console.error("Error deleting account:", error);
      throw error;
    }
  };

  const handleFinalDelete = async () => {
    if (!selectedOption) return;

    setIsProcessing(true);
    
    try {
      // Submit feedback if provided
      if (feedbackReason && user) {
        const feedbackText = feedbackReason === "other" ? otherReason : feedbackReason;
        await supabase.from('user_feedback').insert({
          user_id: user.id,
          rating: 'negative',
          comments: `Account deletion reason: ${feedbackText}`,
          contact_permission: false
        });
      }

      if (selectedOption === "data-only") {
        await clearUserData();
        // Redirect to onboarding as a fresh start
        navigate('/');
        window.location.reload(); // Force a fresh start
      } else if (selectedOption === "account-and-data") {
        await deleteAccount();
      }
    } catch (error) {
      console.error("Error during deletion:", error);
      toast({
        title: "Deletion failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (showFeedback) {
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
        <CardHeader>
          <CardTitle className="text-red-800 dark:text-red-200 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Help us improve – Why are you leaving?
          </CardTitle>
          <CardDescription className="text-red-600 dark:text-red-300">
            Your feedback helps us make the app better for everyone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup value={feedbackReason} onValueChange={(value) => setFeedbackReason(value as FeedbackReason)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="not-useful" id="not-useful" />
              <Label htmlFor="not-useful">I don't find the app useful</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="privacy-concerns" id="privacy-concerns" />
              <Label htmlFor="privacy-concerns">I'm concerned about privacy</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="different-tool" id="different-tool" />
              <Label htmlFor="different-tool">I want to use a different tool</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="technical-issues" id="technical-issues" />
              <Label htmlFor="technical-issues">I had technical issues</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="other" id="other" />
              <Label htmlFor="other">Other (specify)</Label>
            </div>
          </RadioGroup>

          {feedbackReason === "other" && (
            <div className="space-y-2">
              <Label htmlFor="other-reason">Please specify:</Label>
              <Input
                id="other-reason"
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                placeholder="Tell us more..."
              />
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={handleKeepAccount}
              variant="outline"
              className="flex-1 border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-950/20"
              disabled={isProcessing}
            >
              ✅ Keep my account
            </Button>
            <Button
              onClick={handleFinalDelete}
              variant="destructive"
              className="flex-1"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (selectedOption) {
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
        <CardHeader>
          <CardTitle className="text-red-800 dark:text-red-200 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Confirm Deletion
          </CardTitle>
          <CardDescription className="text-red-600 dark:text-red-300">
            {selectedOption === "data-only" 
              ? "This will delete all your data but keep your account active." 
              : "This will permanently delete your account and all associated data."
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border border-red-300 rounded-lg bg-red-100 dark:bg-red-900/30 dark:border-red-700">
            <p className="text-red-800 dark:text-red-200 font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              ⚠️ This action is irreversible. To confirm, type 'delete' in the field below.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-delete">Type "delete" to confirm:</Label>
            <Input
              id="confirm-delete"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder="delete"
              className="font-mono"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={() => setSelectedOption(null)}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              variant="destructive"
              className="flex-1"
              disabled={!isDeleteEnabled}
            >
              Proceed to Feedback
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
      <CardHeader>
        <CardTitle className="text-red-800 dark:text-red-200 flex items-center gap-2">
          <Trash2 className="h-5 w-5" />
          Delete Your Account or Data
        </CardTitle>
        <CardDescription className="text-red-600 dark:text-red-300">
          Choose what you'd like to delete. This action cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          <Button
            onClick={() => handleOptionSelect("data-only")}
            variant="outline"
            className="h-auto p-4 border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-950/30 text-left justify-start"
          >
            <div>
              <div className="font-medium">Keep my account but delete all my data</div>
              <div className="text-sm text-red-600 dark:text-red-400 mt-1">
                Clears all transactions, budgets, and preferences. You can start fresh.
              </div>
            </div>
          </Button>

          <Button
            onClick={() => handleOptionSelect("account-and-data")}
            variant="outline"
            className="h-auto p-4 border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-950/30 text-left justify-start"
          >
            <div>
              <div className="font-medium">Delete my account and all my data</div>
              <div className="text-sm text-red-600 dark:text-red-400 mt-1">
                Permanently removes your account and all associated data.
              </div>
            </div>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DeleteAccountSection;
