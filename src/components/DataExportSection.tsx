import React from "react";
import { Button } from "@/components/ui/button";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileJson, Info } from "lucide-react";
import { useDataExport } from "@/hooks/useDataExport";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const DataExportSection = () => {
    const { exportAllData, isExporting } = useDataExport();

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h3 className="text-lg font-semibold">Ready to move or back up?</h3>
                <p className="text-sm text-muted-foreground">
                    You can download a copy of your data for your own records or to import into other software.
                    This export includes your transactions, budgets, savings goals, subscriptions, and profile information.
                </p>
            </div>

            <Alert variant="default" className="bg-primary/5 border-primary/20">
                <Info className="h-4 w-4 text-primary" />
                <AlertTitle className="text-primary font-semibold">Privacy Note</AlertTitle>
                <AlertDescription className="text-sm text-muted-foreground">
                    Your data is exported as plain CSV files. Please handle these files carefully as they contain sensitive financial information.
                </AlertDescription>
            </Alert>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col space-y-4 p-4 rounded-xl border border-border/50 bg-muted/30">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                            <Download className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <p className="font-medium">CSV Format</p>
                            <p className="text-xs text-muted-foreground">Best for Excel or Google Sheets</p>
                        </div>
                    </div>
                    <Button
                        onClick={exportAllData}
                        disabled={isExporting}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
                    >
                        {isExporting ? "Exporting..." : "Download CSV Files"}
                    </Button>
                </div>

                <div className="flex flex-col space-y-4 p-4 rounded-xl border border-border/50 bg-muted/30 opacity-60">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                            <FileJson className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="font-medium">JSON Format</p>
                            <p className="text-xs text-muted-foreground">Coming soon</p>
                        </div>
                    </div>
                    <Button variant="outline" disabled className="w-full">
                        Not Available
                    </Button>
                </div>
            </div>

            <p className="text-[10px] text-center text-muted-foreground italic">
                Data exports are processed entirely in your browser for maximum privacy.
            </p>
        </div>
    );
};

export default DataExportSection;
