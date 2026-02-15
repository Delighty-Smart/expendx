
import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Maximize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FullscreenChartModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
}

const FullscreenChartModal = ({
    isOpen,
    onClose,
    title,
    icon,
    children
}: FullscreenChartModalProps) => {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[95vw] w-full h-[90vh] flex flex-col p-4 md:p-6 bg-background/95 backdrop-blur-md border border-border/50 shadow-2xl overflow-hidden sm:rounded-3xl">
                <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border/10 mb-2">
                    <div className="flex items-center gap-2">
                        {icon && <div className="text-primary p-2 bg-primary/10 rounded-xl">{icon}</div>}
                        <DialogTitle className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                            {title}
                        </DialogTitle>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="rounded-full h-10 w-10 hover:bg-muted/50 transition-colors"
                    >
                        <X className="h-5 w-5 text-muted-foreground" />
                    </Button>
                </DialogHeader>

                <div className="flex-1 w-full min-h-0 relative animate-in fade-in zoom-in duration-300">
                    <div className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden">
                        {children}
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border/10 text-center md:hidden">
                    <p className="text-xs text-muted-foreground font-medium">
                        Tip: Rotate your device to landscape for a wider view
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default FullscreenChartModal;
