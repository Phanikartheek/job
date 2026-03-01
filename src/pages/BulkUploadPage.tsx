import { useState, useCallback } from "react";
import { Upload, FileSpreadsheet, FileText, AlertCircle, Loader2, CheckCircle2, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import BulkResultsTable, { BulkResultRow } from "@/components/BulkResultsTable";
import DownloadReportButton from "@/components/DownloadReportButton";
import { analyzeJob } from "@/lib/mlEngine";

const ACCEPTED = [".csv", ".xlsx", ".xls", ".txt"];

const BulkUploadPage = () => {
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState<BulkResultRow[]>([]);
    const [error, setError] = useState<string | null>(null);

    const processRows = async (rows: Record<string, string>[]) => {
        setIsProcessing(true);
        setProgress(0);
        setError(null);
        const processed: BulkResultRow[] = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            // Map common column names (case-insensitive)
            const job = {
                title: row.title || row.job_title || row["Job Title"] || row["job title"] || "",
                company: row.company || row.Company || row["Company Name"] || row.employer || "",
                location: row.location || row.Location || row.city || "",
                salary: row.salary || row.Salary || row.compensation || row.pay || "",
                description: row.description || row.Description || row.desc || row.text || "",
                requirements: row.requirements || row.Requirements || row.qualifications || "",
            };

            const scores = analyzeJob(job);
            processed.push({
                id: i + 1,
                title: job.title || `Row ${i + 1}`,
                company: job.company || "Unknown",
                location: job.location,
                salary: job.salary,
                textScore: scores.textScore,
                metadataScore: scores.metadataScore,
                anomalyScore: scores.anomalyScore,
                finalScore: scores.finalScore,
                riskLevel: scores.riskLevel,
                factors: scores.factors,
                llmExplanation: scores.llmExplanation,
            });

            setProgress(Math.round(((i + 1) / rows.length) * 100));
            // Tiny delay to let progress re-render
            if (i % 5 === 0) await new Promise((r) => setTimeout(r, 1));
        }

        setResults(processed);
        setIsProcessing(false);
        toast.success(`Analyzed ${processed.length} job postings!`);
    };

    const parseFile = async (f: File) => {
        const ext = f.name.split(".").pop()?.toLowerCase();

        if (ext === "csv" || ext === "txt") {
            Papa.parse(f, {
                header: true,
                skipEmptyLines: true,
                complete: (res) => processRows(res.data as Record<string, string>[]),
                error: () => {
                    setError("Failed to parse CSV file. Ensure it has column headers.");
                    setIsProcessing(false);
                },
            });
        } else if (ext === "xlsx" || ext === "xls") {
            const buffer = await f.arrayBuffer();
            const wb = XLSX.read(buffer, { type: "array" });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });
            processRows(rows);
        } else {
            setError("Unsupported file type. Please upload a .csv, .xlsx, .xls, or .txt file.");
        }
    };

    const handleFile = (f: File) => {
        setFile(f);
        setResults([]);
        setError(null);
        parseFile(f);
    };

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) handleFile(f);
    }, []);

    const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) handleFile(f);
    };

    const fraudCount = results.filter((r) => r.finalScore >= 50).length;
    const safeCount = results.length - fraudCount;
    const criticalCount = results.filter((r) => r.riskLevel === "CRITICAL").length;

    const reportData = results.map((r) => ({
        title: r.title, company: r.company, location: r.location, salary: r.salary,
        textScore: r.textScore, metadataScore: r.metadataScore, anomalyScore: r.anomalyScore,
        finalScore: r.finalScore, riskLevel: r.riskLevel,
    }));

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">

            {/* Page Header */}
            <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-red-600 shadow-danger">
                    <Upload className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Bulk Job Analysis</h1>
                    <p className="text-gray-400">Upload CSV / Excel / Text files for AI-powered batch fraud detection</p>
                </div>
            </div>

            {/* Upload Zone */}
            <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                className={`relative rounded-2xl border-2 border-dashed p-12 text-center transition-all duration-200 ${isDragging
                        ? "border-red-500 bg-red-950/20"
                        : "border-red-900/40 bg-black hover:border-red-700/60 hover:bg-red-950/10"
                    }`}
            >
                <input
                    type="file"
                    accept={ACCEPTED.join(",")}
                    onChange={onFileInput}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isProcessing}
                />

                <div className="space-y-4 pointer-events-none">
                    <div className="flex justify-center gap-4">
                        <FileSpreadsheet className="w-10 h-10 text-green-500" />
                        <Upload className="w-10 h-10 text-red-500" />
                        <FileText className="w-10 h-10 text-blue-400" />
                    </div>
                    <div>
                        <p className="text-xl font-semibold text-white">
                            {isDragging ? "Drop file here..." : "Drag & Drop or Click to Upload"}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                            Supported: CSV, Excel (.xlsx/.xls), Text files • Each row = one job posting
                        </p>
                    </div>
                    <div className="flex justify-center gap-3 flex-wrap">
                        {["title", "company", "location", "salary", "description"].map((col) => (
                            <span key={col} className="px-2 py-0.5 rounded bg-gray-800 text-gray-400 text-xs font-mono">
                                {col}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Processing progress */}
            {isProcessing && (
                <div className="rounded-xl bg-black border border-red-900/30 p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
                        <p className="text-white font-semibold">
                            Running AI pipeline on {file?.name}… {progress}%
                        </p>
                    </div>
                    <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-red-600 transition-all duration-300 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-xs text-gray-500">
                        RoBERTa → Metadata NN → Isolation Forest → LLM Explanation…
                    </p>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-red-950/30 border border-red-800/40">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-red-300 text-sm">{error}</p>
                </div>
            )}

            {/* Results */}
            {results.length > 0 && (
                <div className="space-y-6">

                    {/* Summary stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <StatCard label="TOTAL ANALYZED" value={results.length} color="gray" />
                        <StatCard label="FRAUD / HIGH RISK" value={fraudCount} color="red" />
                        <StatCard label="SAFE / LOW RISK" value={safeCount} color="green" />
                        <StatCard label="CRITICAL ALERTS" value={criticalCount} color="orange" />
                    </div>

                    {/* Header + download */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <BarChart3 className="w-5 h-5 text-red-500" />
                            <p className="text-white font-bold tracking-widest">ANALYSIS RESULTS</p>
                            <span className="px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 text-xs">
                                {results.length} records
                            </span>
                        </div>
                        <DownloadReportButton data={reportData} fileName={`fraud-report-${Date.now()}`} />
                    </div>

                    {/* Results table with expandable rows */}
                    <BulkResultsTable rows={results} />

                    {/* Bottom note */}
                    <div className="flex items-start gap-2 p-4 rounded-lg bg-gray-900 border border-gray-800">
                        <CheckCircle2 className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-gray-500">
                            Scores computed via RoBERTa text analysis (60%) + Metadata Neural Network (30%) + Isolation Forest anomaly detection (10%).
                            Click any row for detailed model breakdown and LLM explanation. Threshold: ≥ 50 = Fraud Risk.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

const colors: Record<string, string> = {
    gray: "border-gray-700/40 text-white",
    red: "border-red-800/40 text-red-400",
    green: "border-green-800/40 text-green-400",
    orange: "border-orange-800/40 text-orange-400",
};

const StatCard = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <div className={`p-5 rounded-xl bg-black border ${colors[color]}`}>
        <p className="text-3xl font-bold">{value}</p>
        <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">{label}</p>
    </div>
);

export default BulkUploadPage;
