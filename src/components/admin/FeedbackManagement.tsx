
import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { format } from "date-fns";
import { Eye, EyeOff, MessageSquare, Image as ImageIcon, CheckCircle2, Clock, AlertCircle, ChevronLeft, ChevronRight, Search, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

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
  status: 'open' | 'resolved';
}

const FeedbackManagement = () => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComments, setShowComments] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [responseDialog, setResponseDialog] = useState({
    isOpen: false,
    feedbackId: null as string | null,
    response: "",
    userEmail: "",
  });

  const { toast } = useToast();

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);

      const { data: feedbackData, error: feedbackError } = await supabase
        .from('user_feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (feedbackError) throw feedbackError;

      // Check for responses to determine status
      const { data: responseData, error: responseError } = await supabase
        .from('feedback_responses')
        .select('feedback_id');

      if (responseError) throw responseError;

      const respondedIds = new Set(responseData.map(r => r.feedback_id));

      const processedData = await Promise.all(
        feedbackData.map(async (feedback) => {
          const { data: userData } = await supabase
            .from('user_profiles')
            .select('email, first_name, last_name')
            .eq('id', feedback.user_id)
            .single();

          return {
            ...feedback,
            status: respondedIds.has(feedback.id) ? 'resolved' as const : 'open' as const,
            user_profiles: userData || { email: 'Unknown user', first_name: null, last_name: null }
          };
        })
      );

      setFeedbacks(processedData);
    } catch (error) {
      console.error('Error fetching feedback:', error);
      toast({ title: "Error fetching feedback", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useRealtimeSubscription('user_feedback', '*', fetchFeedbacks);

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const handleSendResponse = async () => {
    if (!responseDialog.feedbackId || !responseDialog.response) {
      toast({ title: "Missing information", description: "Please enter a response", variant: "destructive" });
      return;
    }

    try {
      let { data: { user }, error: userError } = await supabase.auth.getUser();

      if (!user || userError) {
        const { data: { session } } = await supabase.auth.getSession();
        user = session?.user || null;
      }

      if (!user) {
        toast({
          title: "Session Required",
          description: "Please log in again to send responses",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase.from('feedback_responses').insert({
        feedback_id: responseDialog.feedbackId,
        admin_id: user.id,
        response_text: responseDialog.response
      });

      if (error) throw error;

      toast({ title: "Response sent", description: `Response sent to ${responseDialog.userEmail}` });
      setResponseDialog({ isOpen: false, feedbackId: null, response: "", userEmail: "" });
      fetchFeedbacks();
    } catch (error: any) {
      console.error('Error sending response:', error);
      toast({ title: "Error sending response", variant: "destructive" });
    }
  };

  const filteredFeedbacks = feedbacks.filter(f => {
    const matchesSearch = searchQuery === "" ||
      f.user_profiles?.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.comments && f.comments.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRating = ratingFilter === "all" || f.rating === ratingFilter;
    const matchesStatus = statusFilter === "all" || f.status === statusFilter;
    return matchesSearch && matchesRating && matchesStatus;
  });

  const totalPages = Math.ceil(filteredFeedbacks.length / itemsPerPage);
  const paginatedFeedbacks = filteredFeedbacks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getRatingBadge = (rating: string) => {
    const colors: Record<string, string> = {
      excellent: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      good: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      fair: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      poor: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      terrible: "bg-red-500/10 text-red-500 border-red-500/20"
    };
    return <Badge className={`capitalize border shadow-none ${colors[rating] || "bg-zinc-500/10 text-zinc-500"}`}>{rating}</Badge>;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">User Sentiment</h2>
          <p className="text-sm text-muted-foreground mt-1">Review feedback, analyze ratings, and respond to users.</p>
        </div>

        <Button variant="outline" onClick={() => setShowComments(!showComments)} className="bg-white/5 border-white/10 text-white">
          {showComments ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
          {showComments ? "Blur Comments" : "Show Comments"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search feedback content..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 bg-black/20 border-white/10 text-white h-11 rounded-xl"
          />
        </div>

        <Select onValueChange={setRatingFilter}>
          <SelectTrigger className="h-11 bg-black/20 border-white/10 text-white rounded-xl">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Rating: All" />
            </div>
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-white/10 text-white">
            <SelectItem value="all">Any Rating</SelectItem>
            <SelectItem value="excellent">Excellent</SelectItem>
            <SelectItem value="good">Good</SelectItem>
            <SelectItem value="fair">Fair</SelectItem>
            <SelectItem value="poor">Poor</SelectItem>
            <SelectItem value="terrible">Terrible</SelectItem>
          </SelectContent>
        </Select>

        <Select onValueChange={setStatusFilter}>
          <SelectTrigger className="h-11 bg-black/20 border-white/10 text-white rounded-xl">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Status: All" />
            </div>
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-white/10 text-white">
            <SelectItem value="all">Any Status</SelectItem>
            <SelectItem value="open">Pending Response</SelectItem>
            <SelectItem value="resolved">Responded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-white/5 bg-black/20 backdrop-blur-md overflow-hidden">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest w-32">Received</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">User</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">Rating</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">Message</TableHead>
              <TableHead className="text-right text-muted-foreground font-bold uppercase text-[10px] tracking-widest">Response</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">Loading feedback entries...</TableCell></TableRow>
            ) : paginatedFeedbacks.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No matching feedback found.</TableCell></TableRow>
            ) : (
              paginatedFeedbacks.map(f => (
                <TableRow key={f.id} className="border-white/5 hover:bg-white/[0.02] transition-colors group">
                  <TableCell className="text-xs font-medium text-muted-foreground">
                    {format(new Date(f.created_at), 'MMM d, hh:mm a')}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-white truncate max-w-[150px]">{f.user_profiles?.email || 'System User'}</span>
                      {f.contact_permission && (
                        <span className="text-[10px] text-primary font-black uppercase tracking-tighter">Permission to contact</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getRatingBadge(f.rating)}</TableCell>
                  <TableCell className="max-w-xs">
                    <div className={`text-sm transition-all duration-300 ${showComments ? 'text-zinc-300' : 'text-zinc-600 blur-sm select-none'}`}>
                      {f.comments || <span className="italic opacity-50">No text provided</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center gap-2">
                      {f.screenshot_url && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white hover:bg-white/5">
                              <ImageIcon className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl bg-black border-white/10 p-2">
                            <img src={f.screenshot_url} alt="Feedback Screenshot" className="w-full h-auto rounded-lg" />
                          </DialogContent>
                        </Dialog>
                      )}

                      {f.status === 'resolved' ? (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1 h-8">
                          <CheckCircle2 className="h-3 w-3" /> Done
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => setResponseDialog({ isOpen: true, feedbackId: f.id, response: "", userEmail: f.user_profiles?.email || 'user' })}
                          className="bg-primary text-white hover:bg-primary/90 rounded-lg h-8 px-3 font-bold text-xs"
                        >
                          Respond
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-xs text-muted-foreground font-medium">
            Page <span className="text-white">{currentPage}</span> of <span className="text-white">{totalPages}</span>
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="bg-white/5 border-white/10 text-white rounded-lg h-9 w-9 p-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="bg-white/5 border-white/10 text-white rounded-lg h-9 w-9 p-0">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={responseDialog.isOpen} onOpenChange={open => setResponseDialog(p => ({ ...p, isOpen: open }))}>
        <DialogContent className="sm:max-w-lg bg-zinc-950 border-white/10 text-white p-8 rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Compose Response</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Your message will be delivered to <span className="text-white font-bold">{responseDialog.userEmail}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-6">
            <Textarea
              value={responseDialog.response}
              onChange={e => setResponseDialog(p => ({ ...p, response: e.target.value }))}
              placeholder="Type your official response here..."
              className="min-h-[220px] bg-white/5 border-white/10 rounded-2xl resize-none font-medium p-6 shadow-inner"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setResponseDialog(p => ({ ...p, isOpen: false }))} className="h-12 rounded-xl px-6 font-bold text-muted-foreground hover:text-white hover:bg-white/10">Discard</Button>
            <Button onClick={handleSendResponse} className="h-12 rounded-xl px-8 font-bold bg-white text-black hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/5">
              Deliver Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeedbackManagement;
