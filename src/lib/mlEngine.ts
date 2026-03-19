// ============================================================
// ML ENGINE — Orchestrator
// Coordinates all models and produces a final fraud risk score.
//
// Architecture (Final Score = 0.7 × Content + 0.3 × Metadata):
//
//   ┌─────────────────────────────────────────┐
//   │       Combined Content Analyzer          │  ← 70%
//   │  ┌──────────────────┐ ┌───────────────┐ │
//   │  │  RoBERTa Text    │ │ Isolation     │ │
//   │  │  Analyzer (75%)  │ │ Forest  (25%) │ │
//   │  └──────────────────┘ └───────────────┘ │
//   └─────────────────────────────────────────┘
//                      +
//   ┌─────────────────────────────────────────┐
//   │       Metadata Neural Network            │  ← 30%
//   │  Salary · Email · Location · Company     │
//   └─────────────────────────────────────────┘
//
// Individual models can also be run directly from:
//   src/lib/models/textModel.ts      → runTextModel(job)
//   src/lib/models/anomalyModel.ts   → runAnomalyModel(job)
//   src/lib/models/metadataModel.ts  → runMetadataModel(job)
//   src/lib/models/contentModel.ts   → runContentModel(job)
// ============================================================

// ---- Shared types (single source of truth) ----
import type { JobInput } from "./models/types";

// ---- Internal model runners ----
import { runContentModel } from "./models/contentModel";
import { runMetadataModel } from "./models/metadataModel";
import { runTextModel } from "./models/textModel";
import { runAnomalyModel } from "./models/anomalyModel";

// ---- Re-export everything for downstream consumers ----
export type { JobInput } from "./models/types";
export { runTextModel, type TextModelResult } from "./models/textModel";
export { runAnomalyModel, type AnomalyModelResult } from "./models/anomalyModel";
export { runMetadataModel, type MetadataModelResult } from "./models/metadataModel";
export { runContentModel, type CombinedContentResult } from "./models/contentModel";

// ============================================================
// SCORE INTERFACES
// ============================================================

export interface MLScores {
    textScore: number;       // Combined Content Model score (0–100)
    metadataScore: number;   // Metadata NN score (0–100)
    anomalyScore: number;    // Anomaly sub-score inside content model
    finalScore: number;      // Weighted composite (0–100)
    riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    factors: string[];
    llmExplanation: string;
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

export function computeFinalScore(contentScore: number, metadataScore: number): number {
    return Math.round(0.7 * contentScore + 0.3 * metadataScore);
}

export function getRiskLevel(score: number): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
    if (score < 25) return "LOW";
    if (score < 50) return "MEDIUM";
    if (score < 75) return "HIGH";
    return "CRITICAL";
}

// ============================================================
// BACKWARD COMPATIBILITY — legacy function names
// ============================================================
export function analyzeText(job: JobInput) { return runTextModel(job); }
export function analyzeAnomaly(job: JobInput) { return runAnomalyModel(job); }
export function analyzeMetadata(job: JobInput) { return runMetadataModel(job); }
export function analyzeContent(job: JobInput) { return runContentModel(job); }

// ============================================================
// LLM EXPLANATION GENERATOR
// ============================================================

function generateExplanation(
    job: JobInput,
    scores: { content: number; metadata: number; anomaly: number; final: number },
    allFlags: string[]
): string {
    const risk = getRiskLevel(scores.final);
    const company = job.company || "this company";
    const title = job.title || "this position";

    if (risk === "LOW") {
        return (
            `The job posting for "${title}" at ${company} shows low fraud risk. ` +
            `Combined Content Analyzer: ${scores.content}/100 · Metadata NN: ${scores.metadata}/100. ` +
            `Composite score: ${scores.final}/100 — SAFE. Verify company website before applying.`
        );
    }
    if (risk === "MEDIUM") {
        const topFlag = allFlags[0] || "some ambiguous signals";
        return (
            `Moderate fraud risk for "${title}" at ${company}. Primary concern: ${topFlag}. ` +
            `Content Model: ${scores.content}/100 · Metadata NN: ${scores.metadata}/100 · Final: ${scores.final}/100. ` +
            `Verify employer identity before sharing personal information.`
        );
    }
    if (risk === "HIGH") {
        return (
            `⚠️ HIGH FRAUD RISK for "${title}" at ${company}. ` +
            `Content Model: ${scores.content}/100 · Metadata NN: ${scores.metadata}/100 · Final: ${scores.final}/100. ` +
            `Red flags: ${allFlags.slice(0, 3).join("; ")}. Do NOT apply or send money.`
        );
    }
    return (
        `🚨 CRITICAL FRAUD ALERT for "${title}" at ${company}. ` +
        `Content: ${scores.content}/100 · Metadata: ${scores.metadata}/100 · Final: ${scores.final}/100. ` +
        `Indicators: ${allFlags.slice(0, 4).join("; ")}. Block and report the sender immediately.`
    );
}

// ============================================================
// MAIN ANALYSIS FUNCTION (Orchestrator)
// ============================================================

export function analyzeJob(job: JobInput): MLScores {
    const contentResult = runContentModel(job);
    const metaResult = runMetadataModel(job);

    const finalScore = computeFinalScore(contentResult.score, metaResult.score);
    const allFlags = [...contentResult.flags, ...metaResult.flags];
    const riskLevel = getRiskLevel(finalScore);
    const llmExplanation = generateExplanation(
        job,
        { content: contentResult.score, metadata: metaResult.score, anomaly: contentResult.anomalySubScore, final: finalScore },
        allFlags
    );

    return {
        textScore: contentResult.score,
        metadataScore: metaResult.score,
        anomalyScore: contentResult.anomalySubScore,
        finalScore,
        riskLevel,
        factors: allFlags,
        llmExplanation,
    };
}

// ============================================================
// FLASK API INTEGRATION — calls real Python ML models
// ============================================================

export interface FlaskAnalysisResult extends MLScores {
    isFake: boolean;
    confidence: number;
    contentScore: number;
}

/**
 * analyzeJobViaFlask — sends job data to Flask backend (real Python ML models).
 * Falls back to local TypeScript models if Flask is unreachable.
 */
export async function analyzeJobViaFlask(job: JobInput): Promise<FlaskAnalysisResult> {
    try {
        const API_URL = import.meta.env.VITE_API_URL || "";
        const response = await fetch(`${API_URL}/api/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(job),
            signal: AbortSignal.timeout(8000), // 8s timeout
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || `Flask returned ${response.status}`);
        }

        const data = await response.json();
        return {
            isFake: data.isFake,
            confidence: data.confidence,
            textScore: data.textScore,
            anomalyScore: data.anomalyScore,
            metadataScore: data.metadataScore,
            contentScore: data.contentScore,
            finalScore: data.finalScore,
            riskLevel: data.riskLevel,
            factors: data.factors,
            llmExplanation: data.llmExplanation,
        };
    } catch (err) {
        // Graceful fallback: use TypeScript models if Flask is offline
        console.warn('[mlEngine] Flask unreachable — falling back to TypeScript models:', err);
        const ts = analyzeJob(job);
        return {
            ...ts,
            isFake: ts.finalScore >= 50,
            confidence: ts.finalScore,
            contentScore: ts.textScore,
        };
    }
}

