import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Trash2 } from "lucide-react";
import { ButtonLoading } from "@/components/ui/loading-state";
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
    setSelectedOption(null);
    setShowFeedback(false);
    setConfirmationText("");
    setFeedbackReason("");
    setOtherReason("");
    toast({
      title: "Cancelled",
      description: "Your account is safe.",
    });
  };

  const handleFinalDelete = async () => {
    if (!selectedOption || !user) return;

    setIsProcessing(true);

    try {
      // Save feedback if provided
      if (feedbackReason) {
        const feedbackText = feedbackReason === "other" ? otherReason : feedbackReason;
        await supabase.from('user_feedback').insert({
          user_id: user.id,
          rating: 'negative',
          comments: `Deletion reason: ${feedbackText}`,
          contact_permission: false
        });
      }

      if (selectedOption === "data-only") {
        // Use the secure database function to delete only user data
        const { error } = await supabase.rpc('delete_user_data', {
          target_user_id: user.id
        });

        if (error) {
          throw error;
        }

        // Clear only expendX-specific localStorage keys (preserve other apps/extensions)
        const keysToRemove = Object.keys(localStorage).filter(k =>
          k.startsWith('expendx_') || k.startsWith('cached_') || k.startsWith('settings_')
        );
        keysToRemove.forEach(k => localStorage.removeItem(k));

        toast({
          title: "Data cleared",
          description: "All your data has been deleted.",
        });

        navigate('/dashboard');
        window.location.reload();
      } else if (selectedOption === "account-and-data") {
        // Use the secure database function to delete account + all data
        const { error: accountError } = await supabase.rpc('delete_user_account', {
          target_user_id: user.id
        });

        if (accountError) {
          throw accountError;
        }

        // Sign out first (needs session token still in localStorage)
        await signOut();

        // Clear only expendX-specific localStorage keys after sign out
        const keysToRemove = Object.keys(localStorage).filter(k =>
          k.startsWith('expendx_') || k.startsWith('cached_') || k.startsWith('settings_')
        );
        keysToRemove.forEach(k => localStorage.removeItem(k));

        navigate('/auth');

        toast({
          title: "Account deleted",
          description: "Your account and all data have been permanently deleted.",
        });
      }
    } catch (error: any) {
      console.error("Error during deletion:", error);
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
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
            Why are you leaving?
          </CardTitle>
          <CardDescription className="text-red-600 dark:text-red-300">
            Help us improve.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            {[
              { id: "not-useful", label: "App isn't useful" },
              { id: "privacy-concerns", label: "Privacy concerns" },
              { id: "different-tool", label: "Using different tool" },
              { id: "technical-issues", label: "Technical issues" },
              { id: "other", label: "Other reason" }
            ].map((option) => (
              <div key={option.id} className="flex items-center space-x-2">
                <input
                  type="radio"
                  id={option.id}
                  name="feedback"
                  value={option.id}
                  checked={feedbackReason === option.id}
                  onChange={(e) => setFeedbackReason(e.target.value as FeedbackReason)}
                  className="h-4 w-4 text-red-600"
                />
                <Label htmlFor={option.id}>{option.label}</Label>
              </div>
            ))}
          </div>

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
              ✅ Keep account
            </Button>
            <Button
              onClick={handleFinalDelete}
              variant="destructive"
              className="flex-1"
              disabled={isProcessing}
            >
              <ButtonLoading
                isLoading={isProcessing}
                loadingText="Processing..."
              >
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              </ButtonLoading>
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
            Confirm Delete
          </CardTitle>
          <CardDescription className="text-red-600 dark:text-red-300">
            {selectedOption === "data-only"
              ? "Delete all data but keep account."
              : "Permanently delete account and all data."
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border border-red-300 rounded-lg bg-red-100 dark:bg-red-900/30 dark:border-red-700">
            <p className="text-red-800 dark:text-red-200 font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              ⚠️ This can't be undone. Type 'delete' to confirm.
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
              Continue
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
          Delete Account or Data
        </CardTitle>
        <CardDescription className="text-red-600 dark:text-red-300">
          Choose what to delete. This can't be undone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          <Button
            onClick={() => handleOptionSelect("data-only")}
            variant="outline"
            className="h-auto p-4 border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-950/30 text-left justify-start"
          >
            <div className="w-full max-w-full">
              <div className="font-medium">Keep account, delete data</div>
              <div className="text-sm text-red-600 dark:text-red-400 mt-1 break-words overflow-wrap-anywhere leading-relaxed whitespace-normal">
                Clear all transactions, budgets, and settings. Start fresh.
              </div>
            </div>
          </Button>

          <Button
            onClick={() => handleOptionSelect("account-and-data")}
            variant="outline"
            className="h-auto p-4 border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-950/30 text-left justify-start"
          >
            <div className="w-full max-w-full">
              <div className="font-medium">Delete account and data</div>
              <div className="text-sm text-red-600 dark:text-red-400 mt-1 break-words overflow-wrap-anywhere leading-relaxed whitespace-normal">
                Permanently remove your account and all data.
              </div>
            </div>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DeleteAccountSection;
