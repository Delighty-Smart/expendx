import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

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
            <DialogContent className="max-w-[95vw] w-full h-[90vh] max-h-[90vh] flex flex-col overflow-hidden transition-all duration-500 p-4 sm:p-6">
                <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b border-border/10 mb-2 shrink-0">
                    <div className="flex items-center gap-2">
                        {icon && <div className="text-primary p-2 bg-primary/10 rounded-xl">{icon}</div>}
                        <DialogTitle className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                            {title}
                        </DialogTitle>
                    </div>
                </DialogHeader>

                <div className="flex-1 w-full min-h-0 overflow-y-auto overflow-x-auto scrollable-container animate-in fade-in zoom-in duration-300">
                    <div className="w-full h-full min-h-[350px] min-w-[300px] flex items-center justify-center">
                        {children}
                    </div>
                </div>

                <div className="mt-2 pt-2 border-t border-border/10 text-center shrink-0">
                    <p className="text-xs text-muted-foreground font-medium">
                        Tip: You can scroll vertically and horizontally to inspect full chart data
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default FullscreenChartModal;
