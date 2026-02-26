
import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
    Megaphone, Trash2, Edit, Power, Calendar as CalendarIcon,
    Image as ImageIcon, MoreVertical, AlertCircle, Eye, ChevronLeft, ChevronRight, Layout
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import BannerForm from "@/components/admin/BannerForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

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
    const [previewBanner, setPreviewBanner] = useState<Banner | null>(null);
    const { toast } = useToast();

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    const [tableError, setTableError] = useState<string | null>(null);

    const checkTable = async () => {
        try {
            const { error } = await supabase.from('admin_banners' as any).select('id').limit(1);
            if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
                setTableError("Database table 'admin_banners' is missing. You MUST run the migration SQL file.");
            } else {
                setTableError(null);
            }
        } catch (e) {
            console.error("Failed to check table:", e);
        }
    };

    const fetchBanners = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('admin_banners' as any)
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setBanners((data as unknown as Banner[]) || []);
        } catch (error: any) {
            console.error("Error fetching banners:", error);
            if (error.code !== '42P01') {
                toast({ title: "Error", description: error.message || "Failed to load banners", variant: "destructive" });
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkTable();
        fetchBanners();
    }, []);

    useRealtimeSubscription('admin_banners', '*', fetchBanners);

    const toggleActive = async (banner: Banner) => {
        try {
            const { error } = await supabase
                .from('admin_banners' as any)
                .update({ is_active: !banner.is_active })
                .eq('id', banner.id);

            if (error) throw error;

            toast({ title: "Success", description: `Banner ${banner.is_active ? 'deactivated' : 'activated'} successfully` });
            setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, is_active: !b.is_active } : b));
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to update banner", variant: "destructive" });
        }
    };

    const deleteBanner = async (id: string) => {
        try {
            const { error } = await supabase.from('admin_banners' as any).delete().eq('id', id);
            if (error) throw error;
            toast({ title: "Success", description: "Banner deleted successfully" });
            setBanners(prev => prev.filter(b => b.id !== id));
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to delete banner", variant: "destructive" });
        }
    };

    const totalPages = Math.ceil(banners.length / itemsPerPage);
    const paginatedBanners = banners.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="space-y-8">
            {tableError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 flex items-start gap-4">
                    <AlertCircle className="h-6 w-6 text-red-500 mt-0.5" />
                    <div>
                        <h3 className="font-bold text-red-500">Database Migration Required</h3>
                        <p className="text-sm text-red-500/80 mt-1">{tableError}</p>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tight">Campaign Assets</h2>
                    <p className="text-sm text-muted-foreground mt-1">Deploy global banners, promotional popups and app notices.</p>
                </div>
                <Button onClick={() => { setSelectedBanner(null); setIsDialogOpen(true); }} className="bg-primary hover:bg-primary/90 text-white font-bold h-11 px-6 rounded-xl">
                    <Megaphone className="mr-2 h-4 w-4" />
                    New Campaign
                </Button>
            </div>

            <div className="rounded-2xl border border-white/5 bg-black/20 backdrop-blur-md overflow-hidden">
                <Table>
                    <TableHeader className="bg-white/5">
                        <TableRow className="border-white/5 hover:bg-transparent">
                            <TableHead className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest w-24">Status</TableHead>
                            <TableHead className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">Promotion Title</TableHead>
                            <TableHead className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">Type</TableHead>
                            <TableHead className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">Scheduling</TableHead>
                            <TableHead className="text-right text-muted-foreground font-bold uppercase text-[10px] tracking-widest">Operations</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">Syncing assets...</TableCell></TableRow>
                        ) : banners.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-64 text-center">
                                    <div className="flex flex-col items-center justify-center space-y-4">
                                        <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center text-muted-foreground">
                                            <Layout className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-white">No active campaigns</p>
                                            <p className="text-xs text-muted-foreground">Start by creating your first global announcement.</p>
                                        </div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedBanners.map((banner) => (
                                <TableRow key={banner.id} className="border-white/5 hover:bg-white/[0.02] transition-colors group">
                                    <TableCell>
                                        <Badge className={`h-6 px-2 text-[10px] font-black uppercase tracking-widest border-none ${banner.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-500/10 text-zinc-500'}`}>
                                            {banner.is_active ? "Live" : "Draft"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            {banner.image_url ? (
                                                <div className="h-10 w-16 bg-white/5 rounded-lg overflow-hidden border border-white/10 shrink-0">
                                                    <img src={banner.image_url} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            ) : (
                                                <div className="h-10 w-16 bg-white/5 rounded-lg flex items-center justify-center border border-dashed border-white/10 shrink-0">
                                                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <p className="font-bold text-white truncate">{banner.title}</p>
                                                <p className="text-xs text-muted-foreground truncate max-w-[200px]">{banner.message || "Visual only"}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-tighter bg-white/5 border-white/10 text-white">
                                            {banner.type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-xs flex flex-col gap-1">
                                            {banner.start_date || banner.end_date ? (
                                                <>
                                                    {banner.start_date && <span className="text-emerald-500/80 font-medium">Starts {format(new Date(banner.start_date), 'MMM d')}</span>}
                                                    {banner.end_date && <span className="text-amber-500/80 font-medium">Expires {format(new Date(banner.end_date), 'MMM d')}</span>}
                                                </>
                                            ) : <span className="text-muted-foreground italic font-medium">Indefinite</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" onClick={() => setPreviewBanner(banner)} className="text-primary hover:text-white hover:bg-primary">
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10 text-white w-48 rounded-xl shadow-2xl">
                                                    <DropdownMenuLabel>Campaign Options</DropdownMenuLabel>
                                                    <DropdownMenuSeparator className="bg-white/5" />
                                                    <DropdownMenuItem onClick={() => { setSelectedBanner(banner); setIsDialogOpen(true); }}>
                                                        <Edit className="h-4 w-4 mr-2" /> Modify Asset
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => toggleActive(banner)}>
                                                        <Power className="h-4 w-4 mr-2" /> {banner.is_active ? "Take Offline" : "Deploy Live"}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator className="bg-white/5" />
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-500 focus:text-red-500 font-bold">
                                                                <Trash2 className="h-4 w-4 mr-2" /> Remove Data
                                                            </DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent className="bg-zinc-950 border-white/10 text-white">
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle className="text-2xl font-black">Delete Campaign?</AlertDialogTitle>
                                                                <AlertDialogDescription className="text-muted-foreground">This will permanently remove the campaign and all its assets. This action is irreversible.</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel className="bg-white/5 border-white/10 text-white">Keep it</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => deleteBanner(banner.id)} className="bg-red-600 text-white hover:bg-red-700">Confirm Deletion</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
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

            {totalPages > 1 && (
                <div className="flex items-center justify-between px-2">
                    <p className="text-xs text-muted-foreground font-medium">Page <span className="text-white">{currentPage}</span> of <span className="text-white">{totalPages}</span></p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="bg-white/5 border-white/10 text-white h-9 rounded-lg">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="bg-white/5 border-white/10 text-white h-9 rounded-lg">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            <BannerForm
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                banner={selectedBanner}
                onSuccess={() => { setIsDialogOpen(false); fetchBanners(); }}
            />

            {/* Preview Modal */}
            <Dialog open={!!previewBanner} onOpenChange={() => setPreviewBanner(null)}>
                <DialogContent className="max-w-2xl bg-zinc-950 border-white/10 text-white p-0 overflow-hidden rounded-[2rem]">
                    <div className="p-8 border-b border-white/5 bg-gradient-to-br from-primary/10 to-transparent">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black">{previewBanner?.title}</DialogTitle>
                            <DialogDescription className="text-muted-foreground uppercase text-[10px] font-black tracking-widest flex items-center gap-2 mt-1">
                                <Badge className="bg-primary/20 text-primary border-none">{previewBanner?.type}</Badge>
                                System Preview Mode
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="p-10 flex flex-col items-center">
                        <div className="w-full max-w-md bg-zinc-900 rounded-3xl border border-white/5 shadow-2xl overflow-hidden">
                            {previewBanner?.image_url && (
                                <div className="aspect-video w-full relative">
                                    <img src={previewBanner.image_url} alt="" className="w-full h-full object-cover" />
                                    {previewBanner.type === 'banner' && <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/50 backdrop-blur-md rounded text-[8px] font-bold text-white uppercase">Header Banner</div>}
                                </div>
                            )}
                            <div className="p-6 space-y-4">
                                <h4 className="text-lg font-bold text-white leading-tight">{previewBanner?.title}</h4>
                                <p className="text-sm text-zinc-400 leading-relaxed font-medium">{previewBanner?.message}</p>
                                {previewBanner?.cta_text && (
                                    <Button className="w-full bg-primary text-white font-black h-11 rounded-xl shadow-lg shadow-primary/20">
                                        {previewBanner.cta_text}
                                    </Button>
                                )}
                            </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-8 font-bold uppercase tracking-widest italic">Mock interface representation</p>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default BannerManagement;
