
import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, SlidersHorizontal, Send, UserPlus, Edit, Eye, EyeOff, Trash2, MoreHorizontal, ChevronLeft, ChevronRight, MapPin, Calendar, Mail, User as UserIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import UserAvatar from "@/components/UserAvatar";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";

type UserRoleType = 'free' | 'pro' | 'premium' | 'admin';

const UserManagement = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<any>(null);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [messageDetails, setMessageDetails] = useState({
    title: "",
    message: "",
    selectedUsers: [] as string[]
  });
  const [newUserDetails, setNewUserDetails] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "free" as UserRoleType
  });
  const [selectAll, setSelectAll] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const { toast } = useToast();

  useRealtimeSubscription('user_profiles', '*', () => {
    fetchUsers();
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*');

      if (error) throw error;

      if (data) {
        setUsers(data);
        const uniqueCountries = [...new Set(data.map(user => user.country).filter(Boolean))];
        setCountries(uniqueCountries as string[]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error fetching users",
        description: "There was a problem loading the user data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: UserRoleType) => {
    try {
      const { error } = await supabase.from('user_profiles').update({
        role: newRole
      }).eq('id', userId);

      if (error) throw error;

      toast({
        title: "Role updated",
        description: `User role has been updated to ${newRole}`
      });

      setUsers(users.map(user => user.id === userId ? { ...user, role: newRole } : user));
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: "Error updating role",
        description: "There was a problem updating the user role",
        variant: "destructive"
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('delete_user_account', {
        target_user_id: userId
      });

      if (error) throw error;

      toast({
        title: "User deleted",
        description: "The user account and all associated data have been removed."
      });

      setUsers(users.filter(u => u.id !== userId));
      setUserDetailsOpen(false);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Deletion failed",
        description: error.message || "Could not delete the user account.",
        variant: "destructive"
      });
    }
  };

  const handleSendMessage = async () => {
    try {
      if (!messageDetails.title || !messageDetails.message) {
        toast({ title: "Missing details", description: "Please provide both a title and message", variant: "destructive" });
        return;
      }
      const recipientIds = selectedUsers.length > 0 ? selectedUsers : users.map(user => user.id);
      const alertPromises = recipientIds.map(userId => supabase.from('alerts').insert({
        user_id: userId,
        title: messageDetails.title,
        message: messageDetails.message,
        type: 'admin_message'
      }));
      await Promise.all(alertPromises);
      toast({ title: "Message sent", description: `Message sent to ${recipientIds.length} user(s)` });
      setMessageModalOpen(false);
      setMessageDetails({ title: "", message: "", selectedUsers: [] });
      setSelectedUsers([]);
      setSelectAll(false);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({ title: "Error sending message", description: "There was a problem sending the message", variant: "destructive" });
    }
  };

  const handleCreateUser = async () => {
    try {
      if (!newUserDetails.email || !newUserDetails.password) {
        toast({ title: "Missing required fields", description: "Email and password are required", variant: "destructive" });
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: newUserDetails.email,
        password: newUserDetails.password,
        options: {
          data: {
            first_name: newUserDetails.firstName,
            last_name: newUserDetails.lastName
          }
        }
      });

      if (error) throw error;

      if (data?.user) {
        const { error: profileError } = await supabase.from('user_profiles').update({
          role: newUserDetails.role,
          first_name: newUserDetails.firstName,
          last_name: newUserDetails.lastName
        }).eq('id', data.user.id);

        if (profileError) throw profileError;

        toast({ title: "User created", description: "The user has been created successfully" });
        setCreateUserModalOpen(false);
        setNewUserDetails({ email: "", password: "", firstName: "", lastName: "", role: "free" });
        fetchUsers();
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({ title: "Error creating user", description: error.message || "There was a problem creating the user", variant: "destructive" });
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = searchQuery === "" ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRoles.length === 0 || selectedRoles.includes(user.role);
    const matchesCountry = selectedCountries.length === 0 || (user.country && selectedCountries.includes(user.country));
    return matchesSearch && matchesRole && matchesCountry;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'premium': return 'default';
      case 'pro': return 'secondary';
      default: return 'outline';
    }
  };

  const handleViewDetails = (user: any) => {
    setSelectedUserForDetails(user);
    setUserDetailsOpen(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Active Users</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage accounts, roles and send targeted messages.</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowInfo(!showInfo)} className="bg-white/5 border-white/10 text-white">
            {showInfo ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {showInfo ? "Hide Details" : "Reveal info"}
          </Button>

          <Button onClick={() => setCreateUserModalOpen(true)} className="bg-primary text-white hover:bg-primary/90">
            <UserPlus className="h-4 w-4 mr-2" />
            New Account
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter by name, email or username..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 bg-black/20 border-white/10 text-white h-11 rounded-xl"
          />
        </div>

        <Select onValueChange={v => setSelectedRoles(v === "all" ? [] : [v])}>
          <SelectTrigger className="h-11 bg-black/20 border-white/10 text-white rounded-xl">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Role: All" />
            </div>
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-white/10 text-white">
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>

        <Select onValueChange={v => setSelectedCountries(v === "all" ? [] : [v])}>
          <SelectTrigger className="h-11 bg-black/20 border-white/10 text-white rounded-xl">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Country: All" />
            </div>
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-white/10 text-white">
            <SelectItem value="all">Everywhere</SelectItem>
            {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/5 bg-black/20 backdrop-blur-md overflow-hidden">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="w-12 text-center">
                <Checkbox
                  checked={selectAll}
                  onCheckedChange={() => {
                    setSelectAll(!selectAll);
                    setSelectedUsers(selectAll ? [] : filteredUsers.map(u => u.id));
                  }}
                  className="border-white/20 data-[state=checked]:bg-primary"
                />
              </TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">Subscriber</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">Location</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">Current Plan</TableHead>
              <TableHead className="text-right text-muted-foreground font-bold uppercase text-[10px] tracking-widest">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">Loading interface...</TableCell></TableRow>
            ) : paginatedUsers.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No users match your criteria.</TableCell></TableRow>
            ) : (
              paginatedUsers.map(user => (
                <TableRow key={user.id} className="border-white/5 hover:bg-white/[0.02] transition-colors group">
                  <TableCell className="text-center">
                    <Checkbox
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={() => {
                        setSelectedUsers(p => p.includes(user.id) ? p.filter(id => id !== user.id) : [...p, user.id]);
                      }}
                      className="border-white/20 data-[state=checked]:bg-primary"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        url={user.avatar_url}
                        name={user.first_name ? `${user.first_name} ${user.last_name || ''}` : user.username || user.email}
                        className="h-10 w-10 ring-2 ring-white/5"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate">
                          {showInfo ? user.first_name ? `${user.first_name} ${user.last_name || ''}` : user.username || user.email : "••••••••••••"}
                        </div>
                        <div className="text-xs text-muted-foreground truncate font-medium">
                          {showInfo ? user.email : "encoded@client.hidden"}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.country ? (
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-white">{user.country}</span>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">{user.continent}</span>
                      </div>
                    ) : <span className="text-muted-foreground italic text-xs">Unknown</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role) as any} className="uppercase text-[9px] font-black tracking-widest px-2 py-0.5 border-none">
                      {user.role} Plan
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => handleViewDetails(user)} className="text-primary hover:text-white hover:bg-primary">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10 text-white w-48 rounded-xl shadow-2xl">
                          <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-white/5" />
                          <DropdownMenuItem onClick={() => {
                            setMessageDetails({ title: "", message: "", selectedUsers: [user.id] });
                            setMessageModalOpen(true);
                          }}>
                            <Send className="h-4 w-4 mr-2" /> Direct Message
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewDetails(user)}>
                            <Edit className="h-4 w-4 mr-2" /> Modify Profile
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/5" />
                          <DropdownMenuItem className="text-red-500 focus:text-red-500 font-bold">
                            <Trash2 className="h-4 w-4 mr-2" /> Terminate Account
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Container */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-xs text-muted-foreground font-medium">
            Showing <span className="text-white">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-white">{Math.min(currentPage * itemsPerPage, filteredUsers.length)}</span> of <span className="text-white">{filteredUsers.length}</span> users
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="bg-white/5 border-white/10 text-white rounded-lg h-9 w-9 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(page)}
                className={`h-9 w-9 p-0 rounded-lg font-bold ${currentPage === page ? 'bg-primary border-primary shadow-lg shadow-primary/20' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}
              >
                {page}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="bg-white/5 border-white/10 text-white rounded-lg h-9 w-9 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* User Details Side Panel */}
      <Sheet open={userDetailsOpen} onOpenChange={setUserDetailsOpen}>
        <SheetContent className="bg-zinc-950 border-white/5 text-white sm:max-w-md overflow-y-auto">
          {selectedUserForDetails && (
            <div className="space-y-8 py-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="relative">
                  <UserAvatar
                    url={selectedUserForDetails.avatar_url}
                    name={selectedUserForDetails.email}
                    className="h-24 w-24 ring-4 ring-primary/20"
                  />
                  <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-emerald-500 border-4 border-zinc-950 shadow-lg shadow-emerald-500/20" />
                </div>
                <div>
                  <h3 className="text-2xl font-black">{selectedUserForDetails.first_name ? `${selectedUserForDetails.first_name} ${selectedUserForDetails.last_name || ''}` : selectedUserForDetails.username || 'System User'}</h3>
                  <p className="text-sm text-muted-foreground font-medium">{selectedUserForDetails.email}</p>
                </div>
                <Badge variant={getRoleBadgeVariant(selectedUserForDetails.role) as any} className="uppercase text-[10px] font-black tracking-[0.2em] px-3 py-1 border-none shadow-lg">
                  {selectedUserForDetails.role} Member
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-10">
                <DetailGridItem icon={Calendar} label="Member Since" value={selectedUserForDetails.created_at ? format(new Date(selectedUserForDetails.created_at), 'MMM yyyy') : 'Long ago'} />
                <DetailGridItem icon={MapPin} label="Region" value={selectedUserForDetails.country || 'Global'} />
                <DetailGridItem icon={UserIcon} label="Username" value={selectedUserForDetails.username || 'Not set'} />
                <DetailGridItem icon={Mail} label="Status" value="Verified" />
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Membership Actions</h4>
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Adjust Member Level</Label>
                    <Select defaultValue={selectedUserForDetails.role} onValueChange={(v: UserRoleType) => handleRoleChange(selectedUserForDetails.id, v)}>
                      <SelectTrigger className="bg-white/5 border-white/10 h-10 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/10 text-white">
                        <SelectItem value="free">Switch to Free</SelectItem>
                        <SelectItem value="pro">Upgrade to Pro</SelectItem>
                        <SelectItem value="premium">Move to Premium</SelectItem>
                        <SelectItem value="admin">Grant Admin Access</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="pt-10 space-y-3">
                <Button className="w-full bg-white text-black font-bold h-12 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/5">
                  Update Account Profile
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" className="w-full text-red-500 font-bold h-12 rounded-xl hover:bg-red-500/10 hover:text-red-500">
                      Delete User & Wipe Data
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-zinc-950 border-white/10 text-white">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-2xl font-black">Dangerous Action</AlertDialogTitle>
                      <AlertDialogDescription className="text-muted-foreground">
                        This will permanently delete <span className="text-white font-bold">{selectedUserForDetails.email}</span>'s account and all associated transactions, budgets, and streaks. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteUser(selectedUserForDetails.id)} className="bg-red-600 text-white hover:bg-red-700 font-bold">
                        Confirm Deletion
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Message Modal */}
      <Dialog open={messageModalOpen} onOpenChange={setMessageModalOpen}>
        <DialogContent className="sm:max-w-lg bg-zinc-950 border-white/10 text-white p-8 rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Broadcast Message</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Direct notification to {messageDetails.selectedUsers.length > 0 ? "targeted recipient" : "selected audience"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-6 font-medium">
            <div className="space-y-2">
              <Label className="text-xs uppercase font-bold tracking-widest text-muted-foreground">Subject Line</Label>
              <Input
                value={messageDetails.title}
                onChange={e => setMessageDetails({ ...messageDetails, title: e.target.value })}
                className="bg-white/5 border-white/10 h-12 rounded-xl"
                placeholder="Alert title..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase font-bold tracking-widest text-muted-foreground">Content</Label>
              <Textarea
                value={messageDetails.message}
                onChange={e => setMessageDetails({ ...messageDetails, message: e.target.value })}
                className="min-h-[160px] bg-white/5 border-white/10 rounded-2xl resize-none p-4"
                placeholder="Write your system message here..."
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setMessageModalOpen(false)} className="h-12 rounded-xl px-6 font-bold text-white hover:bg-white/10">Cancel</Button>
            <Button onClick={handleSendMessage} className="h-12 rounded-xl px-8 font-bold bg-primary text-white hover:scale-105 active:scale-95 transition-all">
              Execute Dispatch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const DetailGridItem = ({ icon: Icon, label, value }: any) => (
  <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
    <div className="flex items-center gap-2 mb-1">
      <Icon className="h-3 w-3 text-primary" />
      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</span>
    </div>
    <p className="text-sm font-bold text-white truncate">{value}</p>
  </div>
);

export default UserManagement;
