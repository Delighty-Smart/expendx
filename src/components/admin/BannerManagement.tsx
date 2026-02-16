import { useState } from "react";
import { format } from "date-fns";
import {
    Megaphone,
    Trash2,
    Edit,
    Power,
    Calendar as CalendarIcon,
    Image as ImageIcon,
    MoreVertical,
    AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import BannerForm from "@/components/admin/BannerForm";

type Banner = {
    id: string;
    title: string;
    type: 'banner' | 'popup';
    content_type: 'text' | 'image' | 'mixed';
    message: string | null;
    image_url: string | null;
    cta_text: string | null;
    cta_link: string | null;
    is_active: boolean;
    start_date: string | null;
    end_date: string | null;
    created_at: string;
};

const BannerManagement = () => {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedBanner, setSelectedBanner] = useState<Banner | null>(null);
    const { toast } = useToast();

    const [tableError, setTableError] = useState<string | null>(null);

    const checkTable = async () => {
        try {
            // Try to select one item just to check if table exists
            const { error } = await supabase.from('admin_banners' as any).select('id').limit(1);
            if (error) {
                if (error.code === '42P01' || error.message?.includes('does not exist')) {
                    setTableError("Database table 'admin_banners' is missing. You MUST run the migration SQL file.");
                } else {
                    console.error("Table check error:", error);
                }
            } else {
                setTableError(null);
            }
        } catch (e) {
            console.error("Failed to check table:", e);
        }
    };

    const fetchBanners = async () => {
        try {
            const { data, error } = await supabase
                .from('admin_banners' as any)
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setBanners((data as unknown as Banner[]) || []);
        } catch (error: any) {
            console.error("Error fetching banners:", error);
            // Don't toast here if it's the 42P01 error, as the Alert will show it
            if (error.code !== '42P01') {
                toast({
                    title: "Error",
                    description: error.message || "Failed to load banners",
                    variant: "destructive",
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Check table on mount
    useState(() => {
        checkTable();
    });

    useRealtimeSubscription('admin_banners', '*', fetchBanners);

    const toggleActive = async (banner: Banner) => {
        try {
            // If activating a banner/popup, check if another one of the same type is active?
            // Optional: Maybe allow only one active banner at a time? 
            // For now, let's allow multiple (user decides).

            const { error } = await supabase
                .from('admin_banners' as any)
                .update({ is_active: !banner.is_active })
                .eq('id', banner.id);

            if (error) throw error;

            toast({
                title: "Success",
                description: `Banner ${banner.is_active ? 'deactivated' : 'activated'} successfully`,
            });
            // Refresh local state immediately to reflect change while waiting for realtime/fetch
            setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, is_active: !b.is_active } : b));
        } catch (error) {
            console.error("Error toggling banner:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to update banner status",
                variant: "destructive",
            });
        }
    };

    const deleteBanner = async (id: string) => {
        if (!confirm("Are you sure you want to delete this item?")) return;

        try {
            const { error } = await supabase
                .from('admin_banners' as any)
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast({
                title: "Success",
                description: "Banner deleted successfully",
            });
            // Immediate UI update
            setBanners(prev => prev.filter(b => b.id !== id));
        } catch (error) {
            console.error("Error deleting banner:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to delete banner",
                variant: "destructive",
            });
        }
    };

    const handleEdit = (banner: Banner) => {
        setSelectedBanner(banner);
        setIsDialogOpen(true);
    };

    const handleCreate = () => {
        setSelectedBanner(null);
        setIsDialogOpen(true);
    };

    return (
        <div className="space-y-6">
            {tableError && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 flex items-start gap-4">
                    <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                    <div className="flex-1">
                        <h3 className="font-semibold text-destructive">Configuration Required</h3>
                        <p className="text-sm text-destructive/90 mt-1">
                            {tableError}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                            Please run the <code>supabase/migrations/20260217000000_create_admin_banners.sql</code> script in your Supabase SQL Editor.
                        </p>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Banners & Popups</h2>
                    <p className="text-muted-foreground">Manage global announcements and promotional popups</p>
                </div>
                <Button onClick={handleCreate}>
                    <Megaphone className="mr-2 h-4 w-4" />
                    Create New
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Items</CardTitle>
                    <CardDescription>
                        View and manage all banners and popups.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-pulse text-muted-foreground">Loading...</div>
                        </div>
                    ) : banners.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="bg-muted/50 p-4 rounded-full mb-4">
                                <Megaphone className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="font-semibold text-lg">No banners created yet</h3>
                            <p className="text-muted-foreground max-w-sm mt-2 mb-6">
                                Create your first banner or popup to announce updates or promotions to your users.
                            </p>
                            <Button onClick={handleCreate} variant="outline">
                                Create First Banner
                            </Button>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Content</TableHead>
                                        <TableHead>Date Range</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {banners.map((banner) => (
                                        <TableRow key={banner.id}>
                                            <TableCell>
                                                <Badge
                                                    variant={banner.is_active ? "default" : "secondary"}
                                                    className={banner.is_active ? "bg-green-500 hover:bg-green-600" : ""}
                                                >
                                                    {banner.is_active ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {banner.title}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="uppercase text-xs">
                                                    {banner.type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 max-w-[200px]">
                                                    {banner.image_url && <ImageIcon className="h-4 w-4 text-blue-500 shrink-0" />}
                                                    <span className="truncate text-sm text-muted-foreground">
                                                        {banner.message || "(Image only)"}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-xs text-muted-foreground">
                                                    {banner.start_date || banner.end_date ? (
                                                        <div className="flex flex-col gap-1">
                                                            {banner.start_date && (
                                                                <span className="flex items-center gap-1">
                                                                    <CalendarIcon className="h-3 w-3" />
                                                                    Start: {format(new Date(banner.start_date), 'MMM d, yyyy')}
                                                                </span>
                                                            )}
                                                            {banner.end_date && (
                                                                <span className="flex items-center gap-1">
                                                                    <CalendarIcon className="h-3 w-3" />
                                                                    End: {format(new Date(banner.end_date), 'MMM d, yyyy')}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        "Always available"
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <span className="sr-only">Open menu</span>
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleEdit(banner)}>
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => toggleActive(banner)}>
                                                            <Power className="mr-2 h-4 w-4" />
                                                            {banner.is_active ? "Deactivate" : "Activate"}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            className="text-red-600 focus:text-red-600"
                                                            onClick={() => deleteBanner(banner.id)}
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <BannerForm
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                banner={selectedBanner}
                onSuccess={() => {
                    setIsDialogOpen(false);
                    fetchBanners();
                }}
            />
        </div>
    );
};

export default BannerManagement;
