import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const bannerSchema = z.object({
    title: z.string().min(1, "Title is required"),
    type: z.enum(["banner", "popup"]),
    content_type: z.enum(["text", "image", "mixed"]),
    message: z.string().optional(),
    image_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
    cta_text: z.string().optional(),
    cta_link: z.string().url("Must be a valid URL").optional().or(z.literal("")),
    is_active: z.boolean().default(false),
});

type BannerFormValues = z.infer<typeof bannerSchema>;

interface BannerFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    banner?: any; // Using any for simplicity with Supabase types, ideally proper type
    onSuccess: () => void;
}

const BannerForm = ({ open, onOpenChange, banner, onSuccess }: BannerFormProps) => {
    const { toast } = useToast();

    const form = useForm<BannerFormValues>({
        resolver: zodResolver(bannerSchema),
        defaultValues: {
            title: "",
            type: "banner",
            content_type: "text",
            message: "",
            image_url: "",
            cta_text: "",
            cta_link: "",
            is_active: false,
        },
    });

    // Reset form when banner changes (edit mode)
    useEffect(() => {
        if (banner) {
            form.reset({
                title: banner.title,
                type: banner.type,
                content_type: banner.content_type,
                message: banner.message || "",
                image_url: banner.image_url || "",
                cta_text: banner.cta_text || "",
                cta_link: banner.cta_link || "",
                is_active: banner.is_active,
            });
        } else {
            form.reset({
                title: "",
                type: "banner",
                content_type: "text",
                message: "",
                image_url: "",
                cta_text: "",
                cta_link: "",
                is_active: false,
            });
        }
    }, [banner, form, open]);

    const onSubmit = async (values: BannerFormValues) => {
        try {
            // Validate based on content type
            if (values.content_type === 'text' && !values.message) {
                form.setError("message", { message: "Message is required for text content" });
                return;
            }
            if (values.content_type === 'image' && !values.image_url) {
                form.setError("image_url", { message: "Image URL is required for image content" });
                return;
            }
            if (values.content_type === 'mixed' && (!values.message || !values.image_url)) {
                if (!values.message) form.setError("message", { message: "Message is required" });
                if (!values.image_url) form.setError("image_url", { message: "Image URL is required" });
                return;
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user found");

            const payload = {
                ...values,
                // sanitize empty strings to null for optional fields
                message: values.message || null,
                image_url: values.image_url || null,
                cta_text: values.cta_text || null,
                cta_link: values.cta_link || null,
                created_by: user.id
            };

            let error;

            if (banner?.id) {
                // Update
                const response = await supabase
                    .from('admin_banners' as any)
                    .update(payload)
                    .eq('id', banner.id);
                error = response.error;
            } else {
                // Create
                const response = await supabase
                    .from('admin_banners' as any)
                    .insert([payload]);
                error = response.error;
            }

            if (error) throw error;

            toast({
                title: "Success",
                description: `Banner ${banner ? 'updated' : 'created'} successfully`,
            });
            onSuccess();
        } catch (error) {
            console.error("Error saving banner:", error);

            // Check for specific error codes
            if (error.code === '42P01') { // PostgreSQL code for undefined table
                toast({
                    title: "Missing Database Table",
                    description: "The 'admin_banners' table does not exist. Please run the migration file.",
                    variant: "destructive",
                });
            } else {
                // Handle various error types (native Error, Supabase error, unknown object)
                let errorMessage = "Unknown error occurred";
                if (error instanceof Error) {
                    errorMessage = error.message;
                } else if (typeof error === 'object' && error !== null) {
                    errorMessage = (error as any).message || (error as any).details || JSON.stringify(error);
                } else if (typeof error === 'string') {
                    errorMessage = error;
                }

                toast({
                    title: "Error Saving",
                    description: errorMessage,
                    variant: "destructive",
                });
            }
        }
    };

    const contentType = form.watch("content_type");

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{banner ? "Edit Banner" : "Create New Banner"}</DialogTitle>
                    <DialogDescription>
                        Configure the content and display settings for this announcement.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Internal Title</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Summer Sale Announcement" {...field} />
                                    </FormControl>
                                    <FormDescription>For admin reference only.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Display Type</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="banner">Banner (Top Bar)</SelectItem>
                                                <SelectItem value="popup">Popup (Modal)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="content_type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Content Style</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select content" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="text">msg only</SelectItem>
                                                <SelectItem value="image">Image Only</SelectItem>
                                                <SelectItem value="mixed">Mixed</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {(contentType === 'text' || contentType === 'mixed') && (
                            <FormField
                                control={form.control}
                                name="message"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Message Content</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Enter your announcement message..."
                                                className="resize-none"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {(contentType === 'image' || contentType === 'mixed') && (
                            <FormField
                                control={form.control}
                                name="image_url"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Image URL</FormLabel>
                                        <FormControl>
                                            <Input placeholder="https://example.com/image.jpg" {...field} />
                                        </FormControl>
                                        <FormDescription>Direct link to your image.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="cta_text"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Button Text (Optional)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., Learn More" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="cta_link"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Button Link (Optional)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="/pricing or https://..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="is_active"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <FormLabel>Active Status</FormLabel>
                                        <FormDescription>
                                            Immediately visible to users if enabled.
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {banner ? "Update Banner" : "Create Banner"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default BannerForm;
