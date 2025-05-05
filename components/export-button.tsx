"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ExportSuccessModal } from "@/components/export-success-modal"

// This component needs access to the ad data
interface ExportButtonProps {
    adData?: any[];
    campaignData?: any[];
}

export function ExportButton({ adData = [], campaignData = [] }: ExportButtonProps) {
    const [isExporting, setIsExporting] = useState(false)
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const [exportType, setExportType] = useState<string>("")
    const [exportUrl, setExportUrl] = useState<string>("")

    const handleExport = async (format: string) => {
        setIsExporting(true)

        try {
            console.log(`Starting ${format} export...`);

            // First, save the current data to Google Sheets
            // This ensures we're exporting the data currently visible in the UI
            const saveResponse = await fetch('/api/save-ads-to-sheets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ads: adData,
                    campaigns: campaignData
                }),
            });

            if (!saveResponse.ok) {
                const errorData = await saveResponse.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to save data with status: ${saveResponse.status}`);
            }

            const saveResult = await saveResponse.json();
            console.log('Data saved to Google Sheets:', saveResult);

            // Now proceed with the export
            if (format === "csv" || format === "excel") {
                const response = await fetch(`/api/export?format=${format}`);

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `Export failed with status: ${response.status}`);
                }

                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `facebook-ads-data.${format === "excel" ? "xlsx" : "csv"}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();

                // Show success modal
                setExportType(format);
                setShowSuccessModal(true);
            }
            // For Looker Studio export
            else if (format === "looker") {
                console.log("Fetching Looker Studio URL...");
                const response = await fetch("/api/export-looker");

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    console.error("Server response:", errorData);
                    throw new Error(errorData.error || `Looker Studio export failed with status: ${response.status}`);
                }

                const data = await response.json();
                console.log("Received Looker Studio response:", data);

                if (data.url) {
                    // Store the URL for the modal
                    setExportUrl(data.url);
                    setExportType("looker");
                    setShowSuccessModal(true);
                } else {
                    throw new Error("No Looker Studio URL returned from server");
                }
            }
        } catch (error: any) {
            console.error("Export failed:", error);
            alert(`Export failed: ${error.message}`);
        } finally {
            setIsExporting(false);
        }
    }

    // Determine if we have data to export
    const hasData = adData.length > 0 || campaignData.length > 0;

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button className="gap-2 w-full sm:w-auto" disabled={isExporting || !hasData}>
                        <Download className="h-4 w-4" />
                        {isExporting ? "Exporting..." : "Export"}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem
                        onClick={() => handleExport("csv")}
                        disabled={!hasData}
                    >
                        Export as CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => handleExport("excel")}
                        disabled={!hasData}
                    >
                        Export as Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => handleExport("looker")}
                        disabled={!hasData}
                    >
                        Export to Looker Studio
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Success Modal */}
            <ExportSuccessModal
                isOpen={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                exportType={exportType}
                exportUrl={exportUrl}
            />
        </>
    )
}