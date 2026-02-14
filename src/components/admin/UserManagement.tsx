import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, SlidersHorizontal, Send, UserPlus, Edit, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import UserAvatar from "@/components/UserAvatar";

// Define the user role type to match the database enum
type UserRoleType = 'free' | 'pro' | 'premium' | 'admin';
const UserManagement = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedContinents, setSelectedContinents] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [continents, setContinents] = useState<string[]>([]);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);
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
  const {
    toast
  } = useToast();

  // Setup realtime subscription to update users list when changes occur
  useRealtimeSubscription('user_profiles', '*', () => {
    console.log("User profiles updated, refreshing list");
    fetchUsers();
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Get ALL users without limit
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*');

      if (error) throw error;

      if (data) {
        setUsers(data);
        const uniqueCountries = [...new Set(data.map(user => user.country).filter(Boolean))];
        const uniqueContinents = [...new Set(data.map(user => user.continent).filter(Boolean))];
        setCountries(uniqueCountries);
        setContinents(uniqueContinents);
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
  }, [toast]);
  const handleRoleChange = async (userId: string, newRole: UserRoleType) => {
    try {
      const {
        error
      } = await supabase.from('user_profiles').update({
        role: newRole
      }).eq('id', userId);
      if (error) throw error;
      toast({
        title: "Role updated",
        description: "User role has been updated successfully"
      });
      setUsers(users.map(user => user.id === userId ? {
        ...user,
        role: newRole
      } : user));
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: "Error updating role",
        description: "There was a problem updating the user role",
        variant: "destructive"
      });
    }
  };
  const handleSendMessage = async () => {
    try {
      if (!messageDetails.title || !messageDetails.message) {
        toast({
          title: "Missing details",
          description: "Please provide both a title and message",
          variant: "destructive"
        });
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
      toast({
        title: "Message sent",
        description: `Message sent to ${recipientIds.length} user(s)`
      });
      setMessageModalOpen(false);
      setMessageDetails({
        title: "",
        message: "",
        selectedUsers: []
      });
      setSelectedUsers([]);
      setSelectAll(false);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error sending message",
        description: "There was a problem sending the message",
        variant: "destructive"
      });
    }
  };
  const handleCreateUser = async () => {
    try {
      if (!newUserDetails.email || !newUserDetails.password) {
        toast({
          title: "Missing required fields",
          description: "Email and password are required",
          variant: "destructive"
        });
        return;
      }

      // Use the auth.signUp method instead which is accessible to admin users
      const {
        data,
        error
      } = await supabase.auth.signUp({
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
        // Update the user profile with the role
        const {
          error: profileError
        } = await supabase.from('user_profiles').update({
          role: newUserDetails.role,
          first_name: newUserDetails.firstName,
          last_name: newUserDetails.lastName
        }).eq('id', data.user.id);
        if (profileError) throw profileError;
        toast({
          title: "User created",
          description: "The user has been created successfully"
        });
        setCreateUserModalOpen(false);
        setNewUserDetails({
          email: "",
          password: "",
          firstName: "",
          lastName: "",
          role: "free"
        });
        fetchUsers();
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Error creating user",
        description: error.message || "There was a problem creating the user",
        variant: "destructive"
      });
    }
  };
  const handleCheckboxChange = (userId: string) => {
    setSelectedUsers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };
  const handleSelectAllChange = () => {
    setSelectAll(!selectAll);
    setSelectedUsers(selectAll ? [] : users.map(user => user.id));
  };
  const toggleInfoVisibility = () => {
    setShowInfo(!showInfo);
  };
  const filteredUsers = users.filter(user => {
    const matchesSearch = searchQuery === "" || user.email?.toLowerCase().includes(searchQuery.toLowerCase()) || user.username?.toLowerCase().includes(searchQuery.toLowerCase()) || user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) || user.last_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRoles.length === 0 || selectedRoles.includes(user.role);
    const matchesCountry = selectedCountries.length === 0 || user.country && selectedCountries.includes(user.country);
    const matchesContinent = selectedContinents.length === 0 || user.continent && selectedContinents.includes(user.continent);
    return matchesSearch && matchesRole && matchesCountry && matchesContinent;
  });
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'premium':
        return 'default';
      case 'pro':
        return 'secondary';
      default:
        return 'outline';
    }
  };
  return <div className="space-y-6">
    <div className="flex justify-between items-center">
      <h2 className="font-bold text-base">User Management</h2>
      <div className="flex gap-2">
        <Button variant="outline" onClick={toggleInfoVisibility} className="flex items-center gap-2 text-base">
          {showInfo ? <>
            <EyeOff className="h-4 w-4" />
            <span>Hide Info</span>
          </> : <>
            <Eye className="h-4 w-4" />
            <span>Show Info</span>
          </>}
        </Button>

        <Dialog open={createUserModalOpen} onOpenChange={setCreateUserModalOpen}>
          <DialogTrigger asChild>
            <Button variant="default">
              <UserPlus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-lg overflow-y-auto max-h-[90vh] p-4 sm:p-6">

            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Enter the details for the new user.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-2">
                <Label htmlFor="email" className="col-span-1">Email</Label>
                <Input id="email" type="email" value={newUserDetails.email} onChange={e => setNewUserDetails({
                  ...newUserDetails,
                  email: e.target.value
                })} className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-2">
                <Label htmlFor="password" className="col-span-1">Password</Label>
                <Input id="password" type="password" value={newUserDetails.password} onChange={e => setNewUserDetails({
                  ...newUserDetails,
                  password: e.target.value
                })} className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-2">
                <Label htmlFor="firstName" className="col-span-1">First Name</Label>
                <Input id="firstName" value={newUserDetails.firstName} onChange={e => setNewUserDetails({
                  ...newUserDetails,
                  firstName: e.target.value
                })} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-2">
                <Label htmlFor="lastName" className="col-span-1">Last Name</Label>
                <Input id="lastName" value={newUserDetails.lastName} onChange={e => setNewUserDetails({
                  ...newUserDetails,
                  lastName: e.target.value
                })} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-2">
                <Label htmlFor="role" className="col-span-1">Role</Label>
                <Select value={newUserDetails.role} onValueChange={(value: UserRoleType) => setNewUserDetails({
                  ...newUserDetails,
                  role: value
                })}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateUserModalOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateUser}>Create User</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={messageModalOpen} onOpenChange={setMessageModalOpen}>
          <DialogTrigger asChild>
            <Button variant="secondary" disabled={filteredUsers.length === 0}>
              <Send className="h-4 w-4 mr-2" />
              Send Message
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-lg overflow-y-auto max-h-[90vh] p-4 sm:p-6">

            <DialogHeader>
              <DialogTitle>Send Message to Users</DialogTitle>
              <DialogDescription>
                This message will be sent to {selectedUsers.length > 0 ? selectedUsers.length : "all"} user(s).
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-2">
                <Label htmlFor="messageTitle" className="col-span-1">Title</Label>
                <Input id="messageTitle" value={messageDetails.title} onChange={e => setMessageDetails({
                  ...messageDetails,
                  title: e.target.value
                })} className="col-span-3" placeholder="Message title" />
              </div>
              <div className="grid grid-cols-4 items-center gap-2">
                <Label htmlFor="messageContent" className="col-span-1">Message</Label>
                <Input id="messageContent" value={messageDetails.message} onChange={e => setMessageDetails({
                  ...messageDetails,
                  message: e.target.value
                })} className="col-span-3" placeholder="Message content" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMessageModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSendMessage}>Send Message</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>

    <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search users..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
      </div>

      <div className="flex space-x-2">
        <Select onValueChange={value => {
          if (value === "all") {
            setSelectedRoles([]);
          } else {
            setSelectedRoles([value]);
          }
        }}>
          <SelectTrigger className="w-40">
            <div className="flex items-center">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              <span>Role</span>
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>

        <Select onValueChange={value => {
          if (value === "all") {
            setSelectedCountries([]);
          } else {
            setSelectedCountries([value]);
          }
        }}>
          <SelectTrigger className="w-40">
            <div className="flex items-center">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              <span>Country</span>
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Countries</SelectItem>
            {countries.map(country => <SelectItem key={country} value={country}>{country}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select onValueChange={value => {
          if (value === "all") {
            setSelectedContinents([]);
          } else {
            setSelectedContinents([value]);
          }
        }}>
          <SelectTrigger className="w-40">
            <div className="flex items-center">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              <span>Continent</span>
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Continents</SelectItem>
            {continents.map(continent => <SelectItem key={continent} value={continent}>{continent}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>

    {loading ? <div className="flex justify-center py-8">
      <div className="animate-pulse text-muted-foreground">Loading users...</div>
    </div> : filteredUsers.length === 0 ? <div className="text-center py-8 text-muted-foreground">
      No users found with the current filters
    </div> : <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox checked={selectAll} onCheckedChange={handleSelectAllChange} aria-label="Select all" size="sm" />
            </TableHead>
            <TableHead>User</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredUsers.map(user => <TableRow key={user.id}>
            <TableCell>
              <Checkbox checked={selectedUsers.includes(user.id)} onCheckedChange={() => handleCheckboxChange(user.id)} aria-label={`Select ${user.email}`} size="sm" />
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-3">
                <UserAvatar
                  url={user.avatar_url}
                  name={user.first_name ? `${user.first_name} ${user.last_name || ''}` : user.username || user.email}
                  className="h-10 w-10 shadow-sm"
                />
                <div>
                  <div className="font-medium">
                    {showInfo ? user.username || user.email : <span className="blur-sm hover:blur-none transition-all select-none">
                      {user.username || user.email}
                    </span>}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {showInfo ? user.email : <span className="blur-sm hover:blur-none transition-all select-none">
                      {user.email}
                    </span>}
                  </div>
                </div>
              </div>
            </TableCell>
            <TableCell>
              {user.country ? <div>
                {showInfo ? <>
                  <div>{user.country}</div>
                  <div className="text-sm text-muted-foreground">{user.continent}</div>
                </> : <span className="blur-sm hover:blur-none transition-all select-none">
                  <div>{user.country}</div>
                  <div className="text-sm text-muted-foreground">{user.continent}</div>
                </span>}
              </div> : <span className="text-muted-foreground">Not specified</span>}
            </TableCell>
            <TableCell>
              <Select defaultValue={user.role} onValueChange={(value: UserRoleType) => handleRoleChange(user.id, value)}>
                <SelectTrigger className="w-28">
                  <SelectValue>
                    <Badge variant={getRoleBadgeVariant(user.role) as any}>
                      {user.role}
                    </Badge>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="icon" onClick={() => {
                setMessageDetails({
                  title: "",
                  message: "",
                  selectedUsers: [user.id]
                });
                setMessageModalOpen(true);
              }}>
                <Send className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Edit className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>)}
        </TableBody>
      </Table>
    </div>}
  </div>;
};
export default UserManagement;
