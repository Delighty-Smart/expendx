
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, Image, MoveUp, MoveDown, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const SlideshowManagement = () => {
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    link_url: "",
    image_url: "",
    active: true,
    visible_to: {
      free: true,
      pro: true,
      premium: true
    }
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchBanners = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('slideshow_banners')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;

      if (data) {
        setBanners(data);
      }
    } catch (error) {
      console.error('Error fetching banners:', error);
      toast({
        title: "Error fetching banners",
        description: "There was a problem loading the banner data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, [toast]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);

      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('banner_images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      return filePath;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const handleCreate = async () => {
    try {
      if (!formData.title) {
        toast({
          title: "Title required",
          description: "Please enter a banner title",
          variant: "destructive",
        });
        return;
      }

      if (!imageFile && !formData.image_url) {
        toast({
          title: "Image required",
          description: "Please upload an image or provide an image URL",
          variant: "destructive",
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "Authentication error",
          description: "You must be logged in to create banners",
          variant: "destructive",
        });
        return;
      }

      let finalImageUrl = formData.image_url;

      if (imageFile) {
        const filePath = await uploadImage(imageFile);
        finalImageUrl = filePath;
      }

      const visibleToArray = [];
      if (formData.visible_to.free) visibleToArray.push('free');
      if (formData.visible_to.pro) visibleToArray.push('pro');
      if (formData.visible_to.premium) visibleToArray.push('premium');

      // Get highest display order
      const highestOrder = banners.length > 0
        ? Math.max(...banners.map(b => b.display_order))
        : -1;

      const { error } = await supabase
        .from('slideshow_banners')
        .insert({
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

      toast({
        title: "Banner created",
        description: "The banner has been created successfully",
      });

      setCreateModalOpen(false);
      resetForm();
      fetchBanners();

    } catch (error) {
      console.error('Error creating banner:', error);
      toast({
        title: "Error creating banner",
        description: "There was a problem creating the banner",
        variant: "destructive",
      });
    }
  };

  const handleEdit = async () => {
    try {
      if (!selectedBanner) return;

      if (!formData.title) {
        toast({
          title: "Title required",
          description: "Please enter a banner title",
          variant: "destructive",
        });
        return;
      }

      let finalImageUrl = formData.image_url;

      if (imageFile) {
        const filePath = await uploadImage(imageFile);
        finalImageUrl = filePath;
      }

      const visibleToArray = [];
      if (formData.visible_to.free) visibleToArray.push('free');
      if (formData.visible_to.pro) visibleToArray.push('pro');
      if (formData.visible_to.premium) visibleToArray.push('premium');

      const { error } = await supabase
        .from('slideshow_banners')
        .update({
          title: formData.title,
          description: formData.description,
          link_url: formData.link_url,
          image_url: finalImageUrl,
          active: formData.active,
          visible_to: visibleToArray,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedBanner.id);

      if (error) throw error;

      toast({
        title: "Banner updated",
        description: "The banner has been updated successfully",
      });

      setEditModalOpen(false);
      resetForm();
      fetchBanners();

    } catch (error) {
      console.error('Error updating banner:', error);
      toast({
        title: "Error updating banner",
        description: "There was a problem updating the banner",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (bannerId: string) => {
    try {
      const { error } = await supabase
        .from('slideshow_banners')
        .delete()
        .eq('id', bannerId);

      if (error) throw error;

      toast({
        title: "Banner deleted",
        description: "The banner has been deleted successfully",
      });

      fetchBanners();

    } catch (error) {
      console.error('Error deleting banner:', error);
      toast({
        title: "Error deleting banner",
        description: "There was a problem deleting the banner",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (bannerId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('slideshow_banners')
        .update({
          active: !currentActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', bannerId);

      if (error) throw error;

      toast({
        title: currentActive ? "Banner deactivated" : "Banner activated",
        description: `The banner has been ${currentActive ? "deactivated" : "activated"} successfully`,
      });

      fetchBanners();

    } catch (error) {
      console.error('Error toggling banner status:', error);
      toast({
        title: "Error updating banner",
        description: "There was a problem updating the banner status",
        variant: "destructive",
      });
    }
  };

  const handleMoveOrder = async (bannerId: string, direction: 'up' | 'down') => {
    try {
      const currentIndex = banners.findIndex(b => b.id === bannerId);
      if (currentIndex === -1) return;

      if (direction === 'up' && currentIndex === 0) return;
      if (direction === 'down' && currentIndex === banners.length - 1) return;

      const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

      const currentBanner = banners[currentIndex];
      const swapBanner = banners[swapIndex];

      // Swap display orders
      const { error: error1 } = await supabase
        .from('slideshow_banners')
        .update({
          display_order: swapBanner.display_order,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentBanner.id);

      if (error1) throw error1;

      const { error: error2 } = await supabase
        .from('slideshow_banners')
        .update({
          display_order: currentBanner.display_order,
          updated_at: new Date().toISOString()
        })
        .eq('id', swapBanner.id);

      if (error2) throw error2;

      fetchBanners();

    } catch (error) {
      console.error('Error changing banner order:', error);
      toast({
        title: "Error changing order",
        description: "There was a problem changing the banner order",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      link_url: "",
      image_url: "",
      active: true,
      visible_to: {
        free: true,
        pro: true,
        premium: true
      }
    });
    setImageFile(null);
    setImagePreview(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Slideshow Banners</h2>
        <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
          <DialogTrigger asChild>
            <Button variant="default">
              <Plus className="h-4 w-4 mr-2" />
              Create Banner
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">

            <DialogHeader>
              <DialogTitle>Create Banner</DialogTitle>
              <DialogDescription>
                Create a new banner for the slideshow on the dashboard.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Banner title"
                      className="h-11 bg-muted/30 border-none rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Optional banner description"
                      rows={3}
                      className="bg-muted/30 border-none rounded-xl resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="link_url">Link URL (optional)</Label>
                    <Input
                      id="link_url"
                      value={formData.link_url}
                      onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                      placeholder="https://example.com"
                      className="h-11 bg-muted/30 border-none rounded-xl"
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                    <Label htmlFor="active" className="font-semibold">Active Status</Label>
                    <Switch
                      id="active"
                      checked={formData.active}
                      onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                    />
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label>Banner Image</Label>
                    <div className="border-2 border-dashed border-border/50 rounded-2xl p-4 text-center cursor-pointer hover:bg-muted/30 transition-all group" onClick={() => document.getElementById('image-upload')?.click()}>
                      {imagePreview ? (
                        <div className="relative">
                          <img
                            src={imagePreview}
                            alt="Banner preview"
                            className="mx-auto rounded-xl max-h-52 object-contain shadow-premium"
                          />
                          <div className="mt-3 text-sm text-muted-foreground font-medium group-hover:text-foreground">Click to change image</div>
                        </div>
                      ) : (
                        <div className="py-8">
                          <div className="w-16 h-16 bg-muted/50 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/10 transition-colors">
                            <Image className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                          <div className="text-sm text-muted-foreground font-medium group-hover:text-foreground">
                            Click to upload an image
                          </div>
                        </div>
                      )}
                      <input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground/60 text-center uppercase tracking-wider font-bold mt-2">
                      Recommended: 1200 x 400 pixels
                    </p>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Visible to</Label>
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border-none">
                        <Label htmlFor="free" className="font-medium">Free Users</Label>
                        <Checkbox
                          id="free"
                          checked={formData.visible_to.free}
                          onCheckedChange={(checked) =>
                            setFormData({
                              ...formData,
                              visible_to: { ...formData.visible_to, free: !!checked }
                            })
                          }
                          className="rounded-md"
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border-none">
                        <Label htmlFor="pro" className="font-medium">Pro Users</Label>
                        <Checkbox
                          id="pro"
                          checked={formData.visible_to.pro}
                          onCheckedChange={(checked) =>
                            setFormData({
                              ...formData,
                              visible_to: { ...formData.visible_to, pro: !!checked }
                            })
                          }
                          className="rounded-md"
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border-none">
                        <Label htmlFor="premium" className="font-medium">Premium Users</Label>
                        <Checkbox
                          id="premium"
                          checked={formData.visible_to.premium}
                          onCheckedChange={(checked) =>
                            setFormData({
                              ...formData,
                              visible_to: { ...formData.visible_to, premium: !!checked }
                            })
                          }
                          className="rounded-md"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" className="h-12 rounded-xl px-6 font-bold" onClick={() => {
                resetForm();
                setCreateModalOpen(false);
              }}>Cancel</Button>
              <Button className="h-12 rounded-xl px-8 font-bold bg-foreground text-background hover:scale-105 active:scale-95 transition-all" onClick={handleCreate}>Create Banner</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-pulse text-muted-foreground">Loading banners...</div>
        </div>
      ) : banners.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No banners found. Create your first banner to display in the slideshow.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Banner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Visible to</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {banners.map((banner, index) => (
                <TableRow key={banner.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{banner.display_order}</div>
                      <div className="space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={index === 0}
                          onClick={() => handleMoveOrder(banner.id, 'up')}
                        >
                          <MoveUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={index === banners.length - 1}
                          onClick={() => handleMoveOrder(banner.id, 'down')}
                        >
                          <MoveDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-16 bg-muted rounded-md overflow-hidden">
                        <img
                          src={banner.image_url}
                          alt={banner.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="font-medium">{banner.title}</div>
                        {banner.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-xs">
                            {banner.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={banner.active ? "default" : "outline"}>
                      {banner.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {banner.visible_to.includes('free') && (
                        <Badge variant="outline">Free</Badge>
                      )}
                      {banner.visible_to.includes('pro') && (
                        <Badge variant="secondary">Pro</Badge>
                      )}
                      {banner.visible_to.includes('premium') && (
                        <Badge>Premium</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {formatDate(banner.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleActive(banner.id, banner.active)}
                      >
                        {banner.active ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
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
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-2xl">

                          <DialogHeader>
                            <DialogTitle>Edit Banner</DialogTitle>
                            <DialogDescription>
                              Update the banner information.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-6 py-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div className="space-y-6">
                                <div className="space-y-2">
                                  <Label htmlFor="edit-title">Title</Label>
                                  <Input
                                    id="edit-title"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="Banner title"
                                    className="h-11 bg-muted/30 border-none rounded-xl"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="edit-description">Description</Label>
                                  <Textarea
                                    id="edit-description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Optional banner description"
                                    rows={3}
                                    className="bg-muted/30 border-none rounded-xl resize-none"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="edit-link_url">Link URL (optional)</Label>
                                  <Input
                                    id="edit-link_url"
                                    value={formData.link_url}
                                    onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                                    placeholder="https://example.com"
                                    className="h-11 bg-muted/30 border-none rounded-xl"
                                  />
                                </div>
                                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                                  <Label htmlFor="edit-active" className="font-semibold">Active Status</Label>
                                  <Switch
                                    id="edit-active"
                                    checked={formData.active}
                                    onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                                  />
                                </div>
                              </div>
                              <div className="space-y-6">
                                <div className="space-y-2">
                                  <Label htmlFor="edit-image">Banner Image</Label>
                                  <div className="border-2 border-dashed border-border/50 rounded-2xl p-4 text-center cursor-pointer hover:bg-muted/30 transition-all group" onClick={() => document.getElementById('edit-image-upload')?.click()}>
                                    {imagePreview ? (
                                      <div className="relative">
                                        <img
                                          src={imagePreview}
                                          alt="Banner preview"
                                          className="mx-auto rounded-xl max-h-52 object-contain shadow-premium"
                                        />
                                        <div className="mt-3 text-sm text-muted-foreground font-medium group-hover:text-foreground">Click to change image</div>
                                      </div>
                                    ) : (
                                      <div className="relative">
                                        <img
                                          src={formData.image_url}
                                          alt="Current banner"
                                          className="mx-auto rounded-xl max-h-52 object-contain shadow-premium"
                                        />
                                        <div className="mt-3 text-sm text-muted-foreground font-medium group-hover:text-foreground">Click to change image</div>
                                      </div>
                                    )}
                                    <input
                                      id="edit-image-upload"
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={handleImageChange}
                                    />
                                  </div>
                                  <p className="text-[10px] text-muted-foreground/60 text-center uppercase tracking-wider font-bold mt-2">
                                    Recommended: 1200 x 400 pixels
                                  </p>
                                </div>
                                <div className="space-y-3">
                                  <Label className="text-sm font-semibold text-foreground">Visible to</Label>
                                  <div className="grid grid-cols-1 gap-2">
                                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border-none">
                                      <Label htmlFor="edit-free" className="font-medium">Free Users</Label>
                                      <Checkbox
                                        id="edit-free"
                                        checked={formData.visible_to.free}
                                        onCheckedChange={(checked) =>
                                          setFormData({
                                            ...formData,
                                            visible_to: { ...formData.visible_to, free: !!checked }
                                          })
                                        }
                                        className="rounded-md"
                                      />
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border-none">
                                      <Label htmlFor="edit-pro" className="font-medium">Pro Users</Label>
                                      <Checkbox
                                        id="edit-pro"
                                        checked={formData.visible_to.pro}
                                        onCheckedChange={(checked) =>
                                          setFormData({
                                            ...formData,
                                            visible_to: { ...formData.visible_to, pro: !!checked }
                                          })
                                        }
                                        className="rounded-md"
                                      />
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border-none">
                                      <Label htmlFor="edit-premium" className="font-medium">Premium Users</Label>
                                      <Checkbox
                                        id="edit-premium"
                                        checked={formData.visible_to.premium}
                                        onCheckedChange={(checked) =>
                                          setFormData({
                                            ...formData,
                                            visible_to: { ...formData.visible_to, premium: !!checked }
                                          })
                                        }
                                        className="rounded-md"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                              variant="destructive"
                              className="h-12 rounded-xl px-6 font-bold"
                              onClick={() => {
                                if (window.confirm('Are you sure you want to delete this banner?')) {
                                  handleDelete(selectedBanner.id);
                                  setEditModalOpen(false);
                                }
                              }}
                            >
                              Delete
                            </Button>
                            <div className="flex-1"></div>
                            <Button variant="ghost" className="h-12 rounded-xl px-6 font-bold" onClick={() => {
                              resetForm();
                              setEditModalOpen(false);
                            }}>Cancel</Button>
                            <Button className="h-12 rounded-xl px-8 font-bold bg-foreground text-background hover:scale-105 active:scale-95 transition-all" onClick={handleEdit}>Update Banner</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this banner?')) {
                            handleDelete(banner.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default SlideshowManagement;
