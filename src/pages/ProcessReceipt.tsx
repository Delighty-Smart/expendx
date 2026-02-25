import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, Check, FileText, Calendar, Landmark, CreditCard, Image as ImageIcon, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from '@capacitor/core';
import Tesseract from 'tesseract.js';
import { cn } from "@/lib/utils";

interface ReceiptData {
    amount: number;
    date: string;
    bankName: string;
    category: string;
}

const ProcessReceipt = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [ocrProgress, setOcrProgress] = useState(0);
    const [displayUrl, setDisplayUrl] = useState<string | null>(null);
    const processedRef = useRef(false);

    const [data, setData] = useState<ReceiptData>({
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        bankName: '',
        category: 'Shopping'
    });

    useEffect(() => {
        if (processedRef.current) return;

        const state = location.state as { fileUri: string, mimeType: string };
        if (!state?.fileUri) {
            toast({ title: "No file found", variant: "destructive" });
            navigate('/dashboard');
            return;
        }

        const runOCR = async () => {
            processedRef.current = true;
            const webUrl = Capacitor.convertFileSrc(state.fileUri);
            setDisplayUrl(webUrl);

            try {
                setLoading(true);
                // Step 1: Initialize Tesseract and Recognize Text
                const { data: { text } } = await Tesseract.recognize(
                    webUrl,
                    'eng',
                    {
                        logger: m => {
                            if (m.status === 'recognizing text') {
                                setOcrProgress(Math.round(m.progress * 100));
                            }
                        }
                    }
                );

                console.log("Extracted Text:", text);

                // Step 2: Traditional Pattern Matching (No AI)
                const parsed = parseReceiptText(text);
                setData(prev => ({ ...prev, ...parsed }));

                toast({
                    title: "Scan Complete",
                    description: "We've auto-filled details we could find. Please verify."
                });
            } catch (err: any) {
                console.error("OCR Error:", err);
                toast({
                    title: "Scan Limited",
                    description: "Could not read all text automatically. Please enter details manually.",
                    variant: "default"
                });
            } finally {
                setLoading(false);
            }
        };

        runOCR();
    }, [location, navigate, toast]);

    const parseReceiptText = (text: string): Partial<ReceiptData> => {
        let amount = 0;
        let bankName = '';
        let date = new Date().toISOString().split('T')[0];

        // 1. Amount Extraction (Currency patterns)
        // Looking for: GHS 100.00, ₵ 50, Total: 1,200.50, etc.
        const amountRegex = /(?:total|amount|sum|paid|ghs|cedi|₵|\$|€|£)\s*[:=]?\s*([\d,]+\.?\d*)/i;
        const amountMatch = text.match(amountRegex);
        if (amountMatch) {
            amount = parseFloat(amountMatch[1].replace(',', ''));
        } else {
            // Fallback: look for any number that looks like a price at the end of a line or after a break
            const priceRegex = /[\n\s]([\d,]+\.\d{2})(?!\d)/;
            const priceMatch = text.match(priceRegex);
            if (priceMatch) amount = parseFloat(priceMatch[1].replace(',', ''));
        }

        // 2. Bank/Source Keywords (Traditional List)
        const banks = ['GTBank', 'Zenith', 'Access', 'Ecobank', 'Stanbic', 'Standard Chartered', 'Absa', 'CalBank', 'Fidelity', 'CBG', 'MTN', 'Telecel', 'Wave', 'Opay', 'Kuda', 'Palmpay'];
        for (const bank of banks) {
            if (text.toLowerCase().includes(bank.toLowerCase())) {
                bankName = bank;
                break;
            }
        }

        // 3. Date Extraction (Standard formats)
        const dateRegex = /(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/;
        const dateMatch = text.match(dateRegex);
        if (dateMatch) {
            date = dateMatch[1].replace(/\//g, '-');
            // Basic normalization of year if 2 digits
            const parts = date.split('-');
            if (parts[2]?.length === 2) parts[2] = '20' + parts[2];
            date = parts.join('-');
        }

        return { amount, bankName, date };
    };

    const handleSave = async () => {
        if (data.amount <= 0) {
            toast({ title: "Validation Error", description: "Please enter a valid amount.", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { error: insertError } = await supabase
                .from('transactions')
                .insert({
                    user_id: user.id,
                    amount: data.amount,
                    date: data.date,
                    merchant: data.bankName || "Shared Receipt",
                    category: data.category,
                    payment_method: 'bank_transfer',
                    notes: 'Auto-scanned via Tesseract OCR'
                });

            if (insertError) throw insertError;

            toast({
                title: "Entry Recorded! ✨",
                description: `Logged ${data.amount} from ${data.bankName || 'Receipt'}.`
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
                {/* Receipt Preview Section */}
                <div className="relative pt-6">
                    <div className="flex items-center justify-between mb-2 px-2">
                        <h2 className="text-sm font-bold flex items-center gap-2">
                            <ImageIcon className="h-4 w-4 text-primary" />
                            Classic OCR Scan
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
                                        <div className="w-48 bg-muted rounded-full h-1 overflow-hidden">
                                            <div
                                                className="bg-primary h-full transition-all duration-300"
                                                style={{ width: `${ocrProgress}%` }}
                                            />
                                        </div>
                                        <p className="text-[10px] font-bold mt-2 text-primary tracking-widest uppercase">Reading Text {ocrProgress}%</p>
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
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                    <Landmark className="h-3 w-3" /> Source
                                </Label>
                                <Input
                                    value={data.bankName}
                                    onChange={(e) => setData({ ...data, bankName: e.target.value })}
                                    placeholder="e.g. MTN MoMo"
                                    className="h-10 bg-muted/30 border-none rounded-xl text-sm"
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
                            >
                                <option>Shopping</option>
                                <option>Food</option>
                                <option>Transport</option>
                                <option>Utilities</option>
                                <option>Transfer</option>
                                <option>Other</option>
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
                        Processed locally using traditional OCR. No cloud AI or API keys were used.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ProcessReceipt;
