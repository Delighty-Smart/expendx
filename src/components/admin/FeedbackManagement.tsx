
import { useState, useEffect } from "react";
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, DialogContent, DialogDescription, 
  DialogFooter, DialogHeader, DialogTitle 
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { format } from "date-fns";
import { Eye, EyeOff } from "lucide-react";

interface UserProfile {
  email: string;
  first_name: string | null;
  last_name: string | null;
}

interface Feedback {
  id: string;
  user_id: string;
  rating: string;
  comments: string | null;
  contact_permission: boolean;
  screenshot_url: string | null;
  created_at: string;
  user_profiles?: UserProfile | null;
}

interface ResponseDialogState {
  isOpen: boolean;
  feedbackId: string | null;
  response: string;
  userEmail: string;
}

const FeedbackManagement = () => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [responseDialog, setResponseDialog] = useState<ResponseDialogState>({
    isOpen: false,
    feedbackId: null,
    response: "",
    userEmail: "",
  });
  
  const { toast } = useToast();

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('user_feedback')
        .select(`
          *,
          user_profiles:user_id(
            email, 
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log('Fetched feedbacks:', data);
      
      // Process the data to ensure it matches our Feedback type
      const processedData = data?.map(item => {
        // If there's an error in the user_profiles relation, provide a fallback
        const userProfile = typeof item.user_profiles === 'object' && item.user_profiles !== null
          ? item.user_profiles
          : { email: 'Unknown user', first_name: null, last_name: null };
          
        return {
          ...item,
          user_profiles: userProfile
        } as Feedback;
      }) || [];
      
      setFeedbacks(processedData);
    } catch (error) {
      console.error('Error fetching feedback:', error);
      toast({
        title: "Error fetching feedback",
        description: "There was a problem loading the feedback data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Set up realtime subscription to feedback table
  useRealtimeSubscription('user_feedback', '*', () => {
    console.log('Feedback table updated, refreshing data');
    fetchFeedbacks();
  });

  // Initial fetch
  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const handleSendResponse = async () => {
    if (!responseDialog.feedbackId || !responseDialog.response) {
      toast({
        title: "Missing information",
        description: "Please enter a response",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication Error",
          description: "You must be logged in to respond to feedback",
          variant: "destructive",
        });
        return;
      }

      // Insert the response
      const { error } = await supabase
        .from('feedback_responses')
        .insert({
          feedback_id: responseDialog.feedbackId,
          admin_id: user.id,
          response_text: responseDialog.response
        });

      if (error) throw error;

      toast({
        title: "Response sent",
        description: `Response sent to ${responseDialog.userEmail}`,
      });

      setResponseDialog({
        isOpen: false,
        feedbackId: null,
        response: "",
        userEmail: "",
      });
      
      // Refresh feedbacks
      fetchFeedbacks();
    } catch (error: any) {
      console.error('Error sending response:', error);
      toast({
        title: "Error sending response",
        description: error.message || "There was a problem sending your response",
        variant: "destructive",
      });
    }
  };

  const openResponseDialog = (feedback: Feedback) => {
    setResponseDialog({
      isOpen: true,
      feedbackId: feedback.id,
      response: "",
      userEmail: feedback.user_profiles?.email || 'Unknown user',
    });
  };

  const getRatingBadge = (rating: string) => {
    switch (rating) {
      case 'excellent':
        return <Badge className="bg-green-500 hover:bg-green-600">Excellent</Badge>;
      case 'good':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Good</Badge>;
      case 'fair':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Fair</Badge>;
      case 'poor':
        return <Badge className="bg-orange-500 hover:bg-orange-600">Poor</Badge>;
      case 'terrible':
        return <Badge className="bg-red-500 hover:bg-red-600">Terrible</Badge>;
      default:
        return <Badge variant="outline">{rating}</Badge>;
    }
  };

  const toggleCommentsVisibility = () => {
    setShowComments(!showComments);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">User Feedback</h2>
        <Button 
          variant="outline" 
          size="sm"
          onClick={toggleCommentsVisibility}
          className="flex items-center gap-2"
        >
          {showComments ? (
            <>
              <EyeOff className="w-4 h-4" />
              <span>Hide Comments</span>
            </>
          ) : (
            <>
              <Eye className="w-4 h-4" />
              <span>Show Comments</span>
            </>
          )}
        </Button>
      </div>
      
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-pulse text-muted-foreground">Loading feedback...</div>
        </div>
      ) : feedbacks.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No feedback submissions found
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Comments</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feedbacks.map((feedback) => (
                <TableRow key={feedback.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(feedback.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    {feedback.user_profiles?.email || 'Unknown user'}
                    {feedback.contact_permission && (
                      <Badge variant="outline" className="ml-2">Can contact</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {getRatingBadge(feedback.rating)}
                  </TableCell>
                  <TableCell className="max-w-md">
                    {showComments ? (
                      <div className="break-words">
                        {feedback.comments || 'No comments provided'}
                      </div>
                    ) : (
                      <div className="blur-sm select-none hover:blur-none transition-all">
                        {feedback.comments || 'No comments provided'}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openResponseDialog(feedback)}
                    >
                      Respond
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog 
        open={responseDialog.isOpen} 
        onOpenChange={(open) => 
          setResponseDialog(prev => ({ ...prev, isOpen: open }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Respond to Feedback</DialogTitle>
            <DialogDescription>
              Send a response to {responseDialog.userEmail}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Textarea
              value={responseDialog.response}
              onChange={(e) => 
                setResponseDialog(prev => ({ ...prev, response: e.target.value }))
              }
              placeholder="Type your response here..."
              className="min-h-[150px]"
            />
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => 
                setResponseDialog(prev => ({ ...prev, isOpen: false }))
              }
            >
              Cancel
            </Button>
            <Button onClick={handleSendResponse}>
              Send Response
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeedbackManagement;
