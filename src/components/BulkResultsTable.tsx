import React, { useState } from "react";
import {
    AlertTriangle, CheckCircle2, ChevronDown, ChevronUp,
} from "lucide-react";
import ModelScorePanel from "@/components/ModelScorePanel";
import LLMExplanationPanel from "@/components/LLMExplanationPanel";

export interface BulkResultRow {
    id: number;
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
    riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    factors: string[];
    llmExplanation: string;
}

const riskBadge = (risk: BulkResultRow["riskLevel"]) => {
    const map = {
        LOW: "bg-green-900/40 text-green-400 border border-green-700/40",
        MEDIUM: "bg-yellow-900/40 text-yellow-400 border border-yellow-700/40",
        HIGH: "bg-orange-900/40 text-orange-400 border border-orange-700/40",
        CRITICAL: "bg-red-900/40 text-red-400 border border-red-700/40",
    };
    return map[risk];
};

const scoreColor = (score: number) => {
    if (score < 25) return "text-green-400";
    if (score < 50) return "text-yellow-400";
    if (score < 75) return "text-orange-400";
    return "text-red-500 font-bold";
};

const BulkResultsTable = ({ rows }: { rows: BulkResultRow[] }) => {
    const [expanded, setExpanded] = useState<number | null>(null);

    const toggle = (id: number) => setExpanded((prev) => (prev === id ? null : id));

    return (
        <div className="rounded-xl bg-black border border-red-900/30 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-900/70 border-b border-red-900/20">
                        <tr>
                            <th className="text-left px-4 py-3 text-gray-500 uppercase text-xs tracking-widest w-8">#</th>
                            <th className="text-left px-4 py-3 text-gray-500 uppercase text-xs tracking-widest">Job Title</th>
                            <th className="text-left px-4 py-3 text-gray-500 uppercase text-xs tracking-widest hidden md:table-cell">Company</th>
                            <th className="text-left px-4 py-3 text-gray-500 uppercase text-xs tracking-widest hidden lg:table-cell">Location</th>
                            <th className="text-center px-4 py-3 text-gray-500 uppercase text-xs tracking-widest hidden lg:table-cell">Text</th>
                            <th className="text-center px-4 py-3 text-gray-500 uppercase text-xs tracking-widest hidden lg:table-cell">Metadata</th>
                            <th className="text-center px-4 py-3 text-gray-500 uppercase text-xs tracking-widest hidden lg:table-cell">Anomaly</th>
                            <th className="text-center px-4 py-3 text-gray-500 uppercase text-xs tracking-widest">Final Score</th>
                            <th className="text-center px-4 py-3 text-gray-500 uppercase text-xs tracking-widest">Risk</th>
                            <th className="px-4 py-3 w-8"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-red-900/10">
                        {rows.map((row) => (
                            <React.Fragment key={row.id}>
                                <tr
                                    className="hover:bg-gray-900/50 cursor-pointer transition-colors"
                                    onClick={() => toggle(row.id)}
                                >
                                    <td className="px-4 py-3 text-gray-600">{row.id}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            {row.finalScore >= 50 ? (
                                                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                                            ) : (
                                                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                                            )}
                                            <span className="text-white font-medium">{row.title || "Unknown"}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{row.company || "—"}</td>
                                    <td className="px-4 py-3 text-gray-400 hidden lg:table-cell">{row.location || "—"}</td>
                                    <td className={`px-4 py-3 text-center hidden lg:table-cell ${scoreColor(row.textScore)}`}>{row.textScore}</td>
                                    <td className={`px-4 py-3 text-center hidden lg:table-cell ${scoreColor(row.metadataScore)}`}>{row.metadataScore}</td>
                                    <td className={`px-4 py-3 text-center hidden lg:table-cell ${scoreColor(row.anomalyScore)}`}>{row.anomalyScore}</td>
                                    <td className={`px-4 py-3 text-center text-lg font-bold ${scoreColor(row.finalScore)}`}>{row.finalScore}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${riskBadge(row.riskLevel)}`}>
                                            {row.riskLevel}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">
                                        {expanded === row.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </td>
                                </tr>

                                {/* Expanded detail row */}
                                {expanded === row.id && (
                                    <tr>
                                        <td colSpan={10} className="px-4 py-6 bg-gray-950">
                                            <div className="grid md:grid-cols-2 gap-6">
                                                <ModelScorePanel
                                                    textScore={row.textScore}
                                                    metadataScore={row.metadataScore}
                                                    anomalyScore={row.anomalyScore}
                                                    contentScore={row.contentScore}
                                                    xgboostScore={row.xgboostScore}
                                                    finalScore={row.finalScore}
                                                />
                                                <div className="space-y-4">
                                                    <LLMExplanationPanel
                                                        explanation={row.llmExplanation}
                                                        riskLevel={row.riskLevel}
                                                    />
                                                    {row.factors.length > 0 && (
                                                        <div className="rounded-lg bg-black border border-red-900/20 p-4">
                                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
                                                                Detected Risk Factors
                                                            </p>
                                                            <ul className="space-y-1.5">
                                                                {row.factors.slice(0, 5).map((f, i) => (
                                                                    <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                                                                        <span className="text-red-500 mt-0.5">▸</span> {f}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default BulkResultsTable;
