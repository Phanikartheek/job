/**
 * ML ENGINE — Orchestrator (RecruitGuard)
 * Coordinates communication with the Python Backend.
 */

import type { JobInput, AnalysisResult } from "../types/job";

// Re-export types for convenience
export type { JobInput, AnalysisResult };

/**
 * analyzeJobViaFlask — sends job data to the RecruitGuard Python backend.
 * This is now the primary path for all analysis.
 */
export async function analyzeJobViaFlask(job: JobInput): Promise<AnalysisResult> {
    try {
        // Use environment variable for API URL (fallback to local if not set)
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
        
        const response = await fetch(`${API_URL}/api/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(job),
            signal: AbortSignal.timeout(10000), // 10s timeout
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || `Server returned ${response.status}`);
        }

        const data = await response.json();
        
        // Ensure the response matches our AnalysisResult interface
        return {
            isFake:          data.isFake ?? false,
            confidence:      data.confidence ?? 0,
            textScore:       data.textScore ?? 0,
            anomalyScore:    data.anomalyScore ?? 0,
            metadataScore:   data.metadataScore ?? 0,
            contentScore:    data.contentScore ?? 0,
            xgboostScore:    data.xgboostScore ?? 0,
            finalScore:      data.finalScore ?? 0,
            riskLevel:       data.riskLevel ?? "LOW",
            factors:         data.factors ?? [],
            insights:        data.insights ?? [],
            llmExplanation:  data.llmExplanation ?? "No explanation provided.",
            status:          data.status ?? "success"
        };
    } catch (err: any) {
        console.error('[mlEngine] Analysis Error:', err);
        throw new Error(err.message || "Failed to connect to detection server.");
    }
}

/**
 * submitFeedback — sends user corrections to the Python backend for self-learning.
 */
export async function submitFeedback(label: 'fraud' | 'legit', jobId: string = "manual"): Promise<void> {
    try {
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
        await fetch(`${API_URL}/api/feedback/report`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobId, actualLabel: label, comments: "User feedback from UI" }),
        });
    } catch (err) {
        console.error('[mlEngine] Feedback Error:', err);
    }
}

/**
 * analyzeJob — Alias for analyzeJobViaFlask to support legacy page calls.
 */
export const analyzeJob = analyzeJobViaFlask;
