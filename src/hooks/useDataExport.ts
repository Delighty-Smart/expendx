import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export const useDataExport = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isExporting, setIsExporting] = useState(false);

    const convertToCSV = (data: any[]) => {
        if (!data || data.length === 0) return "";

        // Get headers from the first object, excluding technical IDs
        const excludedKeys = ["id", "user_id", "admin_id", "created_by", "related_id"];
        const headers = Object.keys(data[0]).filter(key => !excludedKeys.includes(key));
        const csvRows = [];

        // Add header row
        csvRows.push(headers.join(","));

        // Add data rows
        for (const row of data) {
            const values = headers.map(header => {
                const val = row[header];
                const escaped = ("" + (val === null || val === undefined ? "" : val)).replace(/"/g, '""');
                return `"${escaped}"`;
            });
            csvRows.push(values.join(","));
        }

        return csvRows.join("\n");
    };

    const downloadCSV = (content: string, fileName: string) => {
        const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportAllData = async () => {
        if (!user) {
            toast({
                title: "Export failed",
                description: "You must be logged in to export your data.",
                variant: "destructive",
            });
            return;
        }

        setIsExporting(true);
        toast({
            title: "Starting export",
            description: "Fetching all your data from the server...",
        });

        try {
            const tables = [
                "transactions",
                "budget_categories",
                "savings_goals",
                "subscriptions",
                "recurring_templates",
                "user_categories",
                "user_settings",
                "alerts",
                "notification_preferences",
                "user_profiles"
            ] as const;

            const results = await Promise.all(
                tables.map(table =>
                    supabase
                        .from(table as any)
                        .select("*")
                        .eq(table === "user_profiles" ? "id" : "user_id", user.id)
                )
            );

            let successCount = 0;
            const timestamp = format(new Date(), "yyyy-MM-dd_HHmm");

            results.forEach((result, index) => {
                if (result.error) {
                    console.error(`Error exporting ${tables[index]}:`, result.error);
                    return;
                }

                if (result.data && result.data.length > 0) {
                    const csv = convertToCSV(result.data);
                    downloadCSV(csv, `expendx_${tables[index]}_${timestamp}.csv`);
                    successCount++;
                }
            });

            if (successCount > 0) {
                toast({
                    title: "Export complete",
                    description: `Successfully exported ${successCount} files with your data.`,
                });
            } else {
                toast({
                    title: "No data found",
                    description: "We couldn't find any data to export.",
                });
            }
        } catch (error: any) {
            console.error("Export error:", error);
            toast({
                title: "Export failed",
                description: error.message || "An unexpected error occurred during export.",
                variant: "destructive",
            });
        } finally {
            setIsExporting(false);
        }
    };

    return { exportAllData, isExporting };
};
