import { useState } from "react";
import { Download, FileText, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface ReportRow {
    title: string;
    company: string;
    location?: string;
    salary?: string;
    textScore: number;
    metadataScore: number;
    anomalyScore: number;
    finalScore: number;
    riskLevel: string;
}

interface DownloadReportButtonProps {
    data: ReportRow[];
    fileName?: string;
}

const DownloadReportButton = ({ data, fileName = "fraud-analysis-report" }: DownloadReportButtonProps) => {
    const [loading, setLoading] = useState<"pdf" | "csv" | null>(null);

    const downloadCSV = () => {
        setLoading("csv");
        try {
            const headers = ["Job Title", "Company", "Location", "Salary", "Text Score", "Metadata Score", "Anomaly Score", "Final Score", "Risk Level"];
            const rows = data.map((r) => [
                r.title, r.company, r.location || "N/A", r.salary || "N/A",
                r.textScore, r.metadataScore, r.anomalyScore, r.finalScore, r.riskLevel,
            ]);

            const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${fileName}.csv`;
            link.click();
            URL.revokeObjectURL(url);
            toast.success("CSV report downloaded!");
        } catch {
            toast.error("Failed to generate CSV");
        } finally {
            setLoading(null);
        }
    };

    const downloadPDF = () => {
        setLoading("pdf");
        try {
            const doc = new jsPDF({ orientation: "landscape" });

            // Header
            doc.setFillColor(20, 0, 0);
            doc.rect(0, 0, doc.internal.pageSize.width, 30, "F");
            doc.setTextColor(220, 38, 38);
            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.text("AI-POWERED RECRUITMENT FRAUD INTELLIGENCE REPORT", 14, 14);

            doc.setTextColor(150, 150, 150);
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.text(
                `Generated: ${new Date().toLocaleString()} | Total Records: ${data.length} | Powered by RoBERTa + Metadata NN + Isolation Forest`,
                14,
                22
            );

            // Summary stats
            const fraudCount = data.filter((r) => r.finalScore >= 50).length;
            const safeCount = data.length - fraudCount;
            const avgScore = data.reduce((s, r) => s + r.finalScore, 0) / (data.length || 1);

            doc.setTextColor(200, 200, 200);
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.text(`SUMMARY — Fraud Risk: ${fraudCount} | Safe: ${safeCount} | Avg Score: ${avgScore.toFixed(1)}/100`, 14, 38);

            // Table
            autoTable(doc, {
                startY: 44,
                head: [["#", "Job Title", "Company", "Location", "Text", "Metadata", "Anomaly", "Final Score", "Risk Level"]],
                body: data.map((r, i) => [
                    i + 1,
                    r.title,
                    r.company,
                    r.location || "N/A",
                    `${r.textScore}/100`,
                    `${r.metadataScore}/100`,
                    `${r.anomalyScore}/100`,
                    `${r.finalScore}/100`,
                    r.riskLevel,
                ]),
                theme: "grid",
                headStyles: { fillColor: [127, 0, 0], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
                bodyStyles: { fontSize: 8, textColor: [30, 30, 30] },
                alternateRowStyles: { fillColor: [245, 235, 235] },
                columnStyles: { 7: { fontStyle: "bold" }, 8: { fontStyle: "bold" } },
                didDrawCell: (hookData) => {
                    if (hookData.section === "body" && hookData.column.index === 8) {
                        const val = hookData.cell.raw as string;
                        if (val === "CRITICAL") doc.setTextColor(180, 0, 0);
                        else if (val === "HIGH") doc.setTextColor(200, 80, 0);
                        else if (val === "MEDIUM") doc.setTextColor(180, 140, 0);
                        else doc.setTextColor(0, 130, 60);
                    }
                },
            });

            // Footer
            const pageCount = (doc.internal as any).getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(7);
                doc.setTextColor(150, 150, 150);
                doc.text(
                    `Page ${i} of ${pageCount} — AI-Powered Recruitment Fraud Intelligence Platform`,
                    14,
                    doc.internal.pageSize.height - 8
                );
            }

            doc.save(`${fileName}.pdf`);
            toast.success("PDF report downloaded!");
        } catch (err) {
            console.error(err);
            toast.error("Failed to generate PDF");
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="flex items-center gap-2">
            <Button
                variant="outline"
                size="sm"
                onClick={downloadCSV}
                disabled={loading !== null || data.length === 0}
                className="border-green-700/40 text-green-400 hover:bg-green-900/20"
            >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                {loading === "csv" ? "Exporting..." : "Export CSV"}
            </Button>
            <Button
                variant="outline"
                size="sm"
                onClick={downloadPDF}
                disabled={loading !== null || data.length === 0}
                className="border-red-700/40 text-red-400 hover:bg-red-900/20"
            >
                <FileText className="w-4 h-4 mr-2" />
                {loading === "pdf" ? "Generating..." : "Download PDF Report"}
                <Download className="w-3 h-3 ml-1" />
            </Button>
        </div>
    );
};

export default DownloadReportButton;
