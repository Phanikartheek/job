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
    contentScore?: number;
    xgboostScore?: number;
    finalScore: number;
    riskLevel: string;
}

// Single-job report props (optional)
export interface SingleJobReportProps {
    title: string;
    company: string;
    location?: string;
    salary?: string;
    finalScore: number;
    riskLevel: string;
    factors: string[];
    llmExplanation: string;
    textScore: number;
    metadataScore: number;
    anomalyScore: number;
    contentScore?: number;
    xgboostScore?: number;
}

interface DownloadReportButtonProps {
    data: ReportRow[];
    fileName?: string;
    singleJob?: SingleJobReportProps;  // if provided, shows "Download Report" for one job
}

// ---- Color helpers ----
function riskRGB(level: string): [number, number, number] {
    switch (level) {
        case "CRITICAL": return [180, 0, 0];
        case "HIGH": return [200, 80, 0];
        case "MEDIUM": return [180, 140, 0];
        default: return [0, 130, 60];
    }
}

const DownloadReportButton = ({ data, fileName = "fraud-analysis-report", singleJob }: DownloadReportButtonProps) => {
    const [loading, setLoading] = useState<"pdf" | "csv" | "single" | null>(null);

    // ---- Single-Job PDF ----
    const downloadSinglePDF = () => {
        if (!singleJob) return;
        setLoading("single");
        try {
            const doc = new jsPDF({ orientation: "portrait" });
            const W = doc.internal.pageSize.width;
            const [r, g, b] = riskRGB(singleJob.riskLevel);

            // Header banner
            doc.setFillColor(20, 5, 0);
            doc.rect(0, 0, W, 28, "F");
            doc.setFontSize(13);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(240, 80, 0);
            doc.text("5-MODEL AI FRAUD INTELLIGENCE", 14, 12);
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(150, 150, 150);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

            // Risk banner
            doc.setFillColor(r, g, b);
            doc.roundedRect(14, 34, W - 28, 20, 3, 3, "F");
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(255, 255, 255);
            doc.text(`⚠ RISK LEVEL: ${singleJob.riskLevel}  —  FINAL ENSEMBLE SCORE: ${singleJob.finalScore}/100`, 20, 47);

            // Job metadata
            let y = 65;
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(40, 40, 40);
            const meta = [
                ["Job Title", singleJob.title],
                ["Company", singleJob.company],
                ["Location", singleJob.location || "Not specified"],
                ["Salary", singleJob.salary || "Not specified"],
            ];
            meta.forEach(([label, value]) => {
                doc.setFont("helvetica", "bold");
                doc.setTextColor(100, 100, 100);
                doc.text(label + ":", 14, y);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(30, 30, 30);
                doc.text(value, 55, y);
                y += 8;
            });

            // Model score table
            y += 4;
            autoTable(doc, {
                startY: y,
                head: [["AI Pipeline Layer", "Score", "Weight Contribution"]],
                body: [
                    ["1. TF-IDF Text Analyzer", `${singleJob.textScore}/100`, "Feeds Model 4"],
                    ["2. Isolation Forest (Anomalies)", `${singleJob.anomalyScore}/100`, "Feeds Model 4"],
                    ["3. Metadata Neural Network", `${singleJob.metadataScore}/100`, "30%"],
                    ["4. Content Fusion (Text+Anomaly)", `${singleJob.contentScore ?? Math.round(singleJob.textScore*0.75 + singleJob.anomalyScore*0.25)}/100`, "40%"],
                    ["5. XGBoost Ensemble", `${singleJob.xgboostScore ?? singleJob.finalScore}/100`, "30%"],
                    ["⭐ Final Composite Score", `${singleJob.finalScore}/100`, "—"],
                ],
                theme: "grid",
                headStyles: { fillColor: [127, 0, 0], textColor: [255, 255, 255], fontSize: 9, fontStyle: "bold" },
                bodyStyles: { fontSize: 9 },
                alternateRowStyles: { fillColor: [252, 245, 245] },
                columnStyles: { 1: { fontStyle: "bold", halign: "center" }, 2: { halign: "center" } },
            });

            y = (doc as any).lastAutoTable.finalY + 10;

            // Risk flags
            if (singleJob.factors.length > 0) {
                doc.setFontSize(10);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(r, g, b);
                doc.text("DETECTED RISK FACTORS:", 14, y);
                y += 6;
                doc.setFont("helvetica", "normal");
                doc.setTextColor(40, 40, 40);
                singleJob.factors.slice(0, 8).forEach((factor) => {
                    const lines = doc.splitTextToSize(`• ${factor}`, W - 28);
                    doc.text(lines, 14, y);
                    y += lines.length * 5 + 2;
                });
            }

            // LLM Explanation
            y += 4;
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(40, 40, 80);
            doc.text("AI EXPLANATION:", 14, y);
            y += 6;
            doc.setFont("helvetica", "normal");
            doc.setTextColor(50, 50, 50);
            doc.setFontSize(9);
            const explanationLines = doc.splitTextToSize(singleJob.llmExplanation, W - 28);
            doc.text(explanationLines, 14, y);

            // Footer
            doc.setFontSize(7);
            doc.setTextColor(150, 150, 150);
            doc.text("AI-Powered Recruitment Fraud Intelligence Platform", 14, doc.internal.pageSize.height - 8);

            doc.save(`${singleJob.title || "job"}-fraud-report.pdf`);
            toast.success("PDF report downloaded!");
        } catch (err) {
            console.error(err);
            toast.error("Failed to generate PDF");
        } finally {
            setLoading(null);
        }
    };

    // ---- Bulk CSV ----
    const downloadCSV = () => {
        setLoading("csv");
        try {
            const headers = ["Job Title", "Company", "Location", "Salary", "Text Score", "Metadata Score", "Anomaly Score", "Content Fusion", "XGBoost Score", "Final Score", "Risk Level"];
            const rows = data.map((r) => [
                r.title, r.company, r.location || "N/A", r.salary || "N/A",
                r.textScore, r.metadataScore, r.anomalyScore, r.contentScore || 0, r.xgboostScore || 0, r.finalScore, r.riskLevel,
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

    // ---- Bulk PDF ----
    const downloadPDF = () => {
        setLoading("pdf");
        try {
            const doc = new jsPDF({ orientation: "landscape" });

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
                `Generated: ${new Date().toLocaleString()} | Total Records: ${data.length} | 5-Model Ensemble Pipeline`,
                14,
                22
            );

            const fraudCount = data.filter((r) => r.finalScore >= 50).length;
            const safeCount = data.length - fraudCount;
            const avgScore = data.reduce((s, r) => s + r.finalScore, 0) / (data.length || 1);

            doc.setTextColor(200, 200, 200);
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.text(`SUMMARY — Fraud Risk: ${fraudCount} | Safe: ${safeCount} | Avg Score: ${avgScore.toFixed(1)}/100`, 14, 38);

            autoTable(doc, {
                startY: 44,
                head: [["#", "Job Title", "Company", "Text", "Meta", "Anom", "Fusion", "XGB", "Final", "Risk"]],
                body: data.map((r, i) => [
                    i + 1,
                    (r.title || "").substring(0, 25),
                    (r.company || "").substring(0, 15),
                    `${r.textScore}`,
                    `${r.metadataScore}`,
                    `${r.anomalyScore}`,
                    `${r.contentScore || 0}`,
                    `${r.xgboostScore || 0}`,
                    `${r.finalScore}`,
                    r.riskLevel,
                ]),
                theme: "grid",
                headStyles: { fillColor: [127, 0, 0], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
                bodyStyles: { fontSize: 8, textColor: [30, 30, 30] },
                alternateRowStyles: { fillColor: [245, 235, 235] },
                columnStyles: { 8: { fontStyle: "bold" }, 9: { fontStyle: "bold" } },
                didDrawCell: (hookData) => {
                    if (hookData.section === "body" && hookData.column.index === 9) {
                        const val = hookData.cell.raw as string;
                        const [r2, g2, b2] = riskRGB(val);
                        doc.setTextColor(r2, g2, b2);
                    }
                },
            });

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

    // If single-job mode: show one prominent Download Report button
    if (singleJob) {
        return (
            <Button
                onClick={downloadSinglePDF}
                disabled={loading !== null}
                className="bg-red-700 hover:bg-red-800 text-white tracking-widest"
            >
                <FileText className="w-4 h-4 mr-2" />
                {loading === "single" ? "Generating PDF..." : "Download Full Report"}
                <Download className="w-3 h-3 ml-2" />
            </Button>
        );
    }

    // Bulk mode: show CSV + PDF buttons
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
