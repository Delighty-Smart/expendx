import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, Check, FileText, Calendar, Landmark, CreditCard, Image as ImageIcon, X, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from '@capacitor/core';
import { cn } from "@/lib/utils";
import { getCategoriesForType, TransactionType } from "@/types/transactions";

interface ReceiptData {
    amount: number;
    date: string;
    description: string;
    category: string;
    type: TransactionType;
}

const ProcessReceipt = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [displayUrl, setDisplayUrl] = useState<string | null>(null);
    const [categories, setCategories] = useState<string[]>([]);
    const processedRef = useRef(false);

    const [data, setData] = useState<ReceiptData>({
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        description: '',
        category: '',
        type: 'debit'
    });

    useEffect(() => {
        const fetchCategories = async () => {
            const fetched = await getCategoriesForType('debit');
            setCategories(fetched);
            if (fetched.length > 0) {
                setData(prev => ({ ...prev, category: fetched[0] }));
            }
        };
        fetchCategories();
    }, []);

    const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    let width = img.width;
                    let height = img.height;
                    const maxDimension = 800; // Optimal balance for processing
                    if (width > height) {
                        if (width > maxDimension) {
                            height = Math.round((height * maxDimension) / width);
                            width = maxDimension;
                        }
                    } else {
                        if (height > maxDimension) {
                            width = Math.round((width * maxDimension) / height);
                            height = maxDimension;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext("2d");
                    if (!ctx) return reject(new Error("Failed to get canvas context"));
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL("image/jpeg", 0.6));
                };
                img.onerror = reject;
                img.src = e.target?.result as string;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    useEffect(() => {
        if (processedRef.current) return;

        const state = location.state as { fileUri: string, mimeType: string };
        if (!state?.fileUri) {
            toast({ title: "No file found", variant: "destructive" });
            navigate('/dashboard');
            return;
        }

        const runAI_OCR = async () => {
            processedRef.current = true;
            const webUrl = Capacitor.convertFileSrc(state.fileUri);
            setDisplayUrl(webUrl);

            try {
                setLoading(true);

                // Fetch shared file via Capacitor converted URL into Blob
                const response = await fetch(webUrl);
                const blob = await response.blob();
                const file = new File([blob], "shared_receipt.jpg", { type: state.mimeType || "image/jpeg" });

                const compressedBase64 = await compressImage(file);

                // Send to cloud edge function configured with the user's secure OpenRouter API Key
                const { data: edgeData, error } = await supabase.functions.invoke('extract-receipt-data', {
                    body: { imageBase64: compressedBase64 }
                });

                if (error) throw error;
                if (!edgeData?.success || !edgeData?.data) {
                    throw new Error(edgeData?.error || 'Failed to extract receipt data');
                }

                const extracted = edgeData.data;
                setData(prev => ({
                    ...prev,
                    amount: extracted.amount || 0,
                    date: extracted.date || prev.date,
                    description: extracted.description || '',
                    category: extracted.category || prev.category
                }));

                toast({
                    title: "Scan Complete ✨",
                    description: "AI extracted your receipt details. Please verify."
                });
            } catch (err: any) {
                console.error("AI OCR Error:", err);
                toast({
                    title: "Scan Failed",
                    description: err.message || "Failed to scan receipt automatically. Please enter manually.",
                    variant: "destructive"
                });
            } finally {
                setLoading(false);
            }
        };

        runAI_OCR();
    }, [location, navigate, toast]);

    const handleSave = async () => {
        if (data.amount <= 0) {
            toast({ title: "Validation Error", description: "Please enter a valid amount.", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // Safe insertion using exact validated database columns
            const { error: insertError } = await supabase
                .from('transactions')
                .insert({
                    user_id: user.id,
                    amount: data.amount,
                    date: data.date,
                    description: data.description || "Shared Receipt", // Fixed invalid 'merchant' column
                    category: data.category,
                    type: data.type, // Explicitly declared to prevent missing type constraints
                    payment_method: 'bank_transfer',
                    notes: 'Auto-scanned via AI Receipt OCR'
                });

            if (insertError) throw insertError;

            toast({
                title: "Entry Recorded! ✨",
                description: `Logged ${data.amount} from ${data.description || 'Receipt'}.`
            });
            navigate('/transactions');
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background pb-12 animate-in fade-in duration-500">
            <div className="p-4 space-y-4">
                <div className="relative pt-6">
                    <div className="flex items-center justify-between mb-2 px-2">
                        <h2 className="text-sm font-bold flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-primary" />
                            AI Receipt Scanner
                        </h2>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full" onClick={() => navigate('/dashboard')}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    <Card className="relative rounded-2xl border-primary/10 bg-muted/20 overflow-hidden shadow-inner min-h-[160px] flex flex-col items-center justify-center">
                        {displayUrl ? (
                            <>
                                <img
                                    src={displayUrl}
                                    alt="Receipt"
                                    className={cn("w-full h-auto max-h-[300px] object-contain transition-opacity duration-500", loading ? "opacity-30" : "opacity-100")}
                                />
                                {loading && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/40 backdrop-blur-[2px] z-10">
                                        <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
                                        <p className="text-[10px] font-bold mt-2 text-primary tracking-widest uppercase">Extracting via AI...</p>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex flex-col items-center gap-2 text-muted-foreground p-8 text-center">
                                <FileText className="h-10 w-10 opacity-20" />
                                <p className="text-xs">Processing shared file...</p>
                            </div>
                        )}
                    </Card>
                </div>

                <Card className="rounded-3xl border-primary/10 shadow-xl overflow-hidden mt-1">
                    <CardHeader className="bg-primary/5 pb-3">
                        <CardTitle className="text-xs flex items-center gap-2 uppercase tracking-widest text-primary/70">
                            <Search className="h-3 w-3" /> Extracted Info
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 space-y-5">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Confirmed Amount</Label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    value={data.amount || ''}
                                    onChange={(e) => setData({ ...data, amount: parseFloat(e.target.value) || 0 })}
                                    className="text-2xl font-black h-14 bg-muted/30 border-none rounded-2xl pl-10"
                                    placeholder="0.00"
                                    disabled={loading}
                                />
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground text-xl">₵</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                    <Calendar className="h-3 w-3" /> Event Date
                                </Label>
                                <Input
                                    type="date"
                                    value={data.date}
                                    onChange={(e) => setData({ ...data, date: e.target.value })}
                                    className="h-10 bg-muted/30 border-none rounded-xl"
                                    disabled={loading}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                    <Landmark className="h-3 w-3" /> Description
                                </Label>
                                <Input
                                    value={data.description}
                                    onChange={(e) => setData({ ...data, description: e.target.value })}
                                    placeholder="e.g. MTN MoMo"
                                    className="h-10 bg-muted/30 border-none rounded-xl text-sm"
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                <CreditCard className="h-3 w-3" /> Category
                            </Label>
                            <select
                                value={data.category}
                                onChange={(e) => setData({ ...data, category: e.target.value })}
                                className="w-full h-12 bg-muted/30 border-none rounded-2xl px-4 text-sm font-medium focus:ring-2 ring-primary/20 appearance-none"
                                disabled={loading || categories.length === 0}
                            >
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-3 pt-2">
                    <Button
                        className="w-full h-14 rounded-2xl text-lg font-black shadow-xl shadow-primary/20"
                        onClick={handleSave}
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="animate-spin" /> : "Verify & Save"}
                    </Button>
                    <p className="text-[10px] text-center text-muted-foreground px-6">
                        Powered by AI OCR. Secure & accurate extraction.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ProcessReceipt;
