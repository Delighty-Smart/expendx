
import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, Image, MoveUp, MoveDown, Eye, EyeOff, MoreVertical, ChevronLeft, ChevronRight, Layout } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const SlideshowManagement = () => {
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [previewBanner, setPreviewBanner] = useState<any>(null);
  const [selectedBanner, setSelectedBanner] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    link_url: "",
    image_url: "",
    active: true,
    visible_to: { free: true, pro: true, premium: true }
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const { toast } = useToast();

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('slideshow_banners')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      if (data) setBanners(data);
    } catch (error) {
      console.error('Error fetching banners:', error);
      toast({ title: "Error fetching banners", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${fileName}`;
    const { error: uploadError } = await supabase.storage.from('banner_images').upload(filePath, file);
    if (uploadError) throw uploadError;
    return filePath;
  };

  const handleCreate = async () => {
    try {
      if (!formData.title) {
        toast({ title: "Title required", variant: "destructive" });
        return;
      }
      let { data: { user }, error: userError } = await supabase.auth.getUser();

      if (!user || userError) {
        const { data: { session } } = await supabase.auth.getSession();
        user = session?.user || null;
      }

      if (!user) {
        toast({ title: "No authenticated session", description: "Please log in again", variant: "destructive" });
        return;
      }

      let finalImageUrl = formData.image_url;
      if (imageFile) finalImageUrl = await uploadImage(imageFile);

      const visibleToArray = [];
      if (formData.visible_to.free) visibleToArray.push('free');
      if (formData.visible_to.pro) visibleToArray.push('pro');
      if (formData.visible_to.premium) visibleToArray.push('premium');

      const highestOrder = banners.length > 0 ? Math.max(...banners.map(b => b.display_order)) : -1;

      const { error } = await supabase.from('slideshow_banners').insert({
        title: formData.title,
        description: formData.description,
        link_url: formData.link_url,
        image_url: finalImageUrl,
        active: formData.active,
        visible_to: visibleToArray,
        created_by: user.id,
        display_order: highestOrder + 1
      });

      if (error) throw error;
      toast({ title: "Banner created" });
      setCreateModalOpen(false);
      resetForm();
      fetchBanners();
    } catch (error) {
      console.error('Error:', error);
      toast({ title: "Error creating banner", variant: "destructive" });
    }
  };

  const handleEdit = async () => {
    try {
      if (!selectedBanner) return;
      let finalImageUrl = formData.image_url;
      if (imageFile) finalImageUrl = await uploadImage(imageFile);

      const visibleToArray = [];
      if (formData.visible_to.free) visibleToArray.push('free');
      if (formData.visible_to.pro) visibleToArray.push('pro');
      if (formData.visible_to.premium) visibleToArray.push('premium');

      const { error } = await supabase.from('slideshow_banners').update({
        title: formData.title,
        description: formData.description,
        link_url: formData.link_url,
        image_url: finalImageUrl,
        active: formData.active,
        visible_to: visibleToArray,
        updated_at: new Date().toISOString()
      }).eq('id', selectedBanner.id);

      if (error) throw error;
      toast({ title: "Banner updated" });
      setEditModalOpen(false);
      resetForm();
      fetchBanners();
    } catch (error) {
      console.error('Error:', error);
      toast({ title: "Error updating banner", variant: "destructive" });
    }
  };

  const handleDelete = async (bannerId: string) => {
    try {
      const { error } = await supabase.from('slideshow_banners').delete().eq('id', bannerId);
      if (error) throw error;
      toast({ title: "Banner deleted" });
      fetchBanners();
    } catch (error) {
      console.error('Error:', error);
      toast({ title: "Error deleting banner", variant: "destructive" });
    }
  };

  const handleMoveOrder = async (bannerId: string, direction: 'up' | 'down') => {
    try {
      const currentIndex = banners.findIndex(b => b.id === bannerId);
      if (direction === 'up' && currentIndex === 0) return;
      if (direction === 'down' && currentIndex === banners.length - 1) return;

      const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      const currentBanner = banners[currentIndex];
      const swapBanner = banners[swapIndex];

      await Promise.all([
        supabase.from('slideshow_banners').update({ display_order: swapBanner.display_order }).eq('id', currentBanner.id),
        supabase.from('slideshow_banners').update({ display_order: currentBanner.display_order }).eq('id', swapBanner.id)
      ]);

      fetchBanners();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const resetForm = () => {
    setFormData({ title: "", description: "", link_url: "", image_url: "", active: true, visible_to: { free: true, pro: true, premium: true } });
    setImageFile(null);
    setImagePreview(null);
  };

  const totalPages = Math.ceil(banners.length / itemsPerPage);
  const paginatedBanners = banners.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Dashboard Slideshow</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage the premium carousel items shown to users on their main dashboard.</p>
        </div>
        <Button onClick={() => { resetForm(); setCreateModalOpen(true); }} className="bg-primary hover:bg-primary/90 text-white font-bold h-11 px-6 rounded-xl">
          <Plus className="mr-2 h-4 w-4" />
          Add Slide
        </Button>
      </div>

      <div className="rounded-2xl border border-white/5 bg-black/20 backdrop-blur-md overflow-hidden">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest w-24 text-center">Order</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">Visual Asset</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">Visibility</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">Status</TableHead>
              <TableHead className="text-right text-muted-foreground font-bold uppercase text-[10px] tracking-widest">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">Syncing slideshow data...</TableCell></TableRow>
            ) : banners.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center text-muted-foreground">
                      <Layout className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-bold text-white">Empty Slideshow</p>
                      <p className="text-xs text-muted-foreground">The dashboard carousel will be hidden until you add slides.</p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedBanners.map((banner, index) => (
                <TableRow key={banner.id} className="border-white/5 hover:bg-white/[0.02] transition-colors group">
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-1">
                      <Button variant="ghost" size="icon" disabled={index === 0 && currentPage === 1} onClick={() => handleMoveOrder(banner.id, 'up')} className="h-6 w-6 hover:text-primary">
                        <MoveUp className="h-3 w-3" />
                      </Button>
                      <span className="text-xs font-black text-white tabular-nums">{banner.display_order}</span>
                      <Button variant="ghost" size="icon" disabled={index === paginatedBanners.length - 1 && currentPage === totalPages} onClick={() => handleMoveOrder(banner.id, 'down')} className="h-6 w-6 hover:text-primary">
                        <MoveDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-20 bg-white/5 rounded-lg overflow-hidden border border-white/10 shrink-0">
                        <img src={banner.image_url} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-white truncate">{banner.title}</p>
                        <p className="text-[10px] text-muted-foreground truncate uppercase font-bold tracking-widest">Added {format(new Date(banner.created_at), 'MMM d, yyyy')}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[150px]">
                      {banner.visible_to?.map((v: string) => (
                        <Badge key={v} variant="outline" className="text-[9px] font-black uppercase tracking-tighter bg-white/5 border-white/10 text-white px-1.5 py-0">
                          {v}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`h-6 px-2 text-[10px] font-black uppercase tracking-widest border-none ${banner.active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-500/10 text-zinc-500'}`}>
                      {banner.active ? "Live" : "Draft"}
                    </Badge>
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
                          <DropdownMenuLabel>Slide Management</DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-white/5" />
                          <DropdownMenuItem onClick={() => {
                            setSelectedBanner(banner);
                            setFormData({
                              title: banner.title,
                              description: banner.description || "",
                              link_url: banner.link_url || "",
                              image_url: banner.image_url,
                              active: banner.active,
                              visible_to: {
                                free: banner.visible_to.includes('free'),
                                pro: banner.visible_to.includes('pro'),
                                premium: banner.visible_to.includes('premium')
                              }
                            });
                            setEditModalOpen(true);
                          }}>
                            <Edit className="h-4 w-4 mr-2" /> Edit Asset
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/5" />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-500 focus:text-red-500 font-bold">
                                <Trash2 className="h-4 w-4 mr-2" /> Kill Asset
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-zinc-950 border-white/10 text-white">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-2xl font-black">Remove Slide?</AlertDialogTitle>
                                <AlertDialogDescription className="text-muted-foreground">This slide will be removed from all user dashboards immediately.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-white/5 border-white/10 text-white">Keep it</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(banner.id)} className="bg-red-600 text-white hover:bg-red-700">Confirm Deletion</AlertDialogAction>
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
            <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="bg-white/5 border-white/10 text-white h-9 rounded-lg px-2">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="bg-white/5 border-white/10 text-white h-9 rounded-lg px-2">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal - Shared UI structure */}
      <Dialog
        open={createModalOpen || editModalOpen}
        onOpenChange={(open) => { if (!open) { setCreateModalOpen(false); setEditModalOpen(false); resetForm(); } }}
      >
        <DialogContent className="sm:max-w-2xl bg-zinc-950 border-white/10 text-white p-0 overflow-hidden rounded-[2rem]">
          <div className="p-8 border-b border-white/5 bg-gradient-to-br from-primary/10 to-transparent">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">{editModalOpen ? "Modify Slide" : "Initialize New Slide"}</DialogTitle>
              <DialogDescription className="text-muted-foreground mt-1">Configure the visual parameters and routing for this asset.</DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[70vh] overflow-y-auto">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Title Content</Label>
                <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="bg-white/5 border-white/10 h-11 rounded-xl" placeholder="Summer Promotion..." />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Subtext Details</Label>
                <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="bg-white/5 border-white/10 rounded-2xl resize-none h-24" placeholder="Brief descriptive subtext..." />
              </div>
              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">Deployment Status</Label>
                    <p className="text-[10px] text-muted-foreground">Is this slide currently active?</p>
                  </div>
                  <Switch checked={formData.active} onCheckedChange={checked => setFormData({ ...formData, active: checked })} />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Slide Target (URL)</Label>
                <Input value={formData.link_url} onChange={e => setFormData({ ...formData, link_url: e.target.value })} className="bg-white/5 border-white/10 h-11 rounded-xl" placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Visual Asset</Label>
                <div
                  className="aspect-video bg-white/5 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 transition-all overflow-hidden relative group"
                  onClick={() => document.getElementById('slide-image-input')?.click()}
                >
                  {imagePreview || formData.image_url ? (
                    <img src={imagePreview || formData.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Image className="h-8 w-8 text-muted-foreground mb-2 group-hover:scale-110 transition-transform" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Upload 1200x400</p>
                    </>
                  )}
                  <input id="slide-image-input" type="file" className="hidden" onChange={handleImageChange} accept="image/*" />
                </div>
              </div>
              <div className="space-y-3">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Audience Targeting</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['free', 'pro', 'premium'] as const).map(tier => (
                    <div key={tier} className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all cursor-pointer ${formData.visible_to[tier] ? 'bg-primary/20 border-primary shadow-lg shadow-primary/10' : 'bg-white/5 border-white/5 opacity-50'}`} onClick={() => setFormData({ ...formData, visible_to: { ...formData.visible_to, [tier]: !formData.visible_to[tier] } })}>
                      <span className="text-[10px] font-black uppercase tracking-widest">{tier}</span>
                      <Checkbox checked={formData.visible_to[tier]} className="mt-2 hidden" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-8 border-t border-white/5 bg-white/[0.02] gap-3">
            <Button variant="ghost" onClick={() => { setCreateModalOpen(false); setEditModalOpen(false); resetForm(); }} className="h-12 rounded-xl px-8 font-bold text-muted-foreground hover:text-white hover:bg-white/5">Abort</Button>
            <Button onClick={editModalOpen ? handleEdit : handleCreate} className="h-12 rounded-xl px-12 font-bold bg-white text-black hover:scale-105 active:scale-95 transition-all shadow-2xl">
              {editModalOpen ? "Commit Changes" : "Create Asset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={!!previewBanner} onOpenChange={() => setPreviewBanner(null)}>
        <DialogContent className="max-w-4xl bg-zinc-950 border-white/10 text-white p-0 overflow-hidden rounded-[2rem] shadow-3xl">
          <div className="aspect-[12/4] w-full relative group">
            <img src={previewBanner?.image_url} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute bottom-8 left-8 max-w-lg">
              <h3 className="text-3xl font-black text-white leading-tight">{previewBanner?.title}</h3>
              <p className="text-lg text-white/70 font-medium mt-2 leading-relaxed">{previewBanner?.description}</p>
              {previewBanner?.link_url && (
                <Button className="mt-6 bg-white text-black font-black h-12 px-8 rounded-xl hover:scale-105 transition-all">
                  Interact Now
                </Button>
              )}
            </div>
            <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-xl border border-white/10 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white">
              Live Dashboard Preview
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SlideshowManagement;
