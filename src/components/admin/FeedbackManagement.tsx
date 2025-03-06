
import { useState, useEffect } from "react";
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Dialog, DialogContent, DialogDescription, 
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, SelectContent, SelectItem, 
  SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { 
  Card, CardContent, CardDescription, 
  CardFooter, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Search, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const FeedbackManagement = () => {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRatings, setSelectedRatings] = useState<string[]>([]);
  const [responseModalOpen, setResponseModalOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);
  const [responseText, setResponseText] = useState("");
  const { toast } = useToast();

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('user_feedback')
        .select(`
          *,
          user_profiles:user_id (
            email, username, first_name, last_name, avatar_url
          ),
          feedback_responses (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setFeedbacks(data);
      }
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

  useEffect(() => {
    fetchFeedbacks();
  }, [toast]);

  const handleSendResponse = async () => {
    try {
      if (!responseText) {
        toast({
          title: "Response text required",
          description: "Please enter a response message",
          variant: "destructive",
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication error",
          description: "You must be logged in to respond to feedback",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('feedback_responses')
        .insert({
          feedback_id: selectedFeedback.id,
          admin_id: user.id,
          response_text: responseText
        });

      if (error) throw error;

      toast({
        title: "Response sent",
        description: "Your response has been sent to the user",
      });

      setResponseModalOpen(false);
      setResponseText("");
      fetchFeedbacks();

    } catch (error) {
      console.error('Error sending response:', error);
      toast({
        title: "Error sending response",
        description: "There was a problem sending your response",
        variant: "destructive",
      });
    }
  };

  const getRatingVariant = (rating: string) => {
    switch (rating) {
      case "excellent": return "default";
      case "good": return "secondary";
      case "neutral": return "outline";
      case "poor": return "destructive";
      case "very_poor": return "destructive";
      default: return "outline";
    }
  };

  const formatRating = (rating: string) => {
    return rating.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const filteredFeedbacks = feedbacks.filter(feedback => {
    // Search filter
    const matchesSearch = 
      searchQuery === "" || 
      feedback.user_profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feedback.user_profiles?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feedback.comments?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Rating filter
    const matchesRating = selectedRatings.length === 0 || selectedRatings.includes(feedback.rating);
    
    return matchesSearch && matchesRating;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">User Feedback</h2>
      </div>
      
      <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search feedback..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex space-x-2">
          <Select
            onValueChange={(value) => {
              if (value === "all") {
                setSelectedRatings([]);
              } else {
                setSelectedRatings([value]);
              }
            }}
          >
            <SelectTrigger className="w-40">
              <div className="flex items-center">
                <Filter className="h-4 w-4 mr-2" />
                <span>Rating</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ratings</SelectItem>
              <SelectItem value="excellent">Excellent</SelectItem>
              <SelectItem value="good">Good</SelectItem>
              <SelectItem value="neutral">Neutral</SelectItem>
              <SelectItem value="poor">Poor</SelectItem>
              <SelectItem value="very_poor">Very Poor</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-pulse text-muted-foreground">Loading feedback...</div>
        </div>
      ) : filteredFeedbacks.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No feedback found with the current filters
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFeedbacks.map((feedback) => (
            <Card key={feedback.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <Badge variant={getRatingVariant(feedback.rating) as any}>
                      {formatRating(feedback.rating)}
                    </Badge>
                    <CardTitle className="mt-2 text-base">
                      {feedback.user_profiles?.username || feedback.user_profiles?.email || "User"}
                    </CardTitle>
                    <CardDescription>
                      {formatDate(feedback.created_at)}
                    </CardDescription>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-muted overflow-hidden flex items-center justify-center">
                    {feedback.user_profiles?.avatar_url ? (
                      <img 
                        src={`/lovable-uploads/${feedback.user_profiles.avatar_url}`} 
                        alt="User avatar" 
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-semibold text-muted-foreground">
                        {feedback.user_profiles?.first_name?.[0] || ''}
                        {feedback.user_profiles?.last_name?.[0] || ''}
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground mb-4 max-h-40 overflow-auto">
                  {feedback.comments || <em>No comment provided</em>}
                </div>
                
                {feedback.screenshot_url && (
                  <div className="mt-2 mb-4">
                    <img 
                      src={`/lovable-uploads/${feedback.screenshot_url}`} 
                      alt="Feedback screenshot" 
                      className="rounded-md w-full h-auto"
                    />
                  </div>
                )}
                
                {feedback.feedback_responses && feedback.feedback_responses.length > 0 && (
                  <div className="mt-4 p-3 bg-secondary/20 rounded-md">
                    <p className="text-xs text-muted-foreground mb-1">Admin response:</p>
                    <p className="text-sm">{feedback.feedback_responses[0].response_text}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(feedback.feedback_responses[0].created_at)}
                    </p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t pt-3 flex justify-between">
                <p className="text-xs text-muted-foreground">
                  Contact permission: {feedback.contact_permission ? "Yes" : "No"}
                </p>
                
                {(!feedback.feedback_responses || feedback.feedback_responses.length === 0) && (
                  <Dialog open={responseModalOpen} onOpenChange={setResponseModalOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedFeedback(feedback)}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Respond
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Respond to Feedback</DialogTitle>
                        <DialogDescription>
                          Your response will be sent to the user as an alert and displayed alongside their feedback.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="mb-2">
                          <Label className="mb-1 block">User Feedback:</Label>
                          <div className="text-sm text-muted-foreground p-3 bg-secondary/20 rounded-md">
                            {selectedFeedback?.comments || <em>No comment provided</em>}
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="response">Your Response</Label>
                          <Textarea
                            id="response"
                            placeholder="Write your response..."
                            value={responseText}
                            onChange={(e) => setResponseText(e.target.value)}
                            rows={5}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setResponseModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSendResponse}>Send Response</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default FeedbackManagement;
