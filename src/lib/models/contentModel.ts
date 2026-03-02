// ============================================================
// MODEL 4: Combined Content Analyzer (Text + Anomaly Fusion)
// Merges RoBERTa Text Analyzer + Isolation Forest into ONE model.
// Internal weights: 75% text   +  25% anomaly
// Input:  JobInput  →  Output: CombinedContentResult
// Score range: 0–100 (higher = more fraudulent content)
//
// HOD EXPLANATION:
//   Both text and anomaly models analyze the SAME data source
//   (job text fields). Fusing them removes redundancy and creates
//   a single, richer "content understanding" model. The Metadata
//   Neural Network remains separate because it analyzes DIFFERENT
//   structured data (salary numbers, email domains, company name).
// ============================================================

import type { JobInput } from "./types";
import { runTextModel, type TextModelResult } from "./textModel";
import { runAnomalyModel, type AnomalyModelResult } from "./anomalyModel";

export interface CombinedContentResult {
    score: number;
    flags: string[];
    modelName: "Combined Content Analyzer";
    textSubScore: number;
    anomalySubScore: number;
    textResult: TextModelResult;
    anomalyResult: AnomalyModelResult;
    fusionWeights: { text: number; anomaly: number };
}

/**
 * Combined Content Analyzer — Model 4 (Text + Anomaly Fusion)
 *
 * Runs both RoBERTa text analysis and Isolation Forest anomaly detection,
 * then fuses their scores with configurable weights.
 *
 * By default: 75% text + 25% anomaly.
 * You can change the weights for experiments:
 *   runContentModel(job, { textWeight: 0.6, anomalyWeight: 0.4 })
 *
 * @standalone  Import and call runContentModel(job) directly.
 * @orchestrated Used in mlEngine.ts with 70% weight in final score.
 */
export function runContentModel(
    job: JobInput,
    weights: { textWeight?: number; anomalyWeight?: number } = {}
): CombinedContentResult {
    const textWeight = weights.textWeight ?? 0.75;
    const anomalyWeight = weights.anomalyWeight ?? 0.25;

    const textResult = runTextModel(job);
    const anomalyResult = runAnomalyModel(job);

    const fusedScore = Math.round(
        textWeight * textResult.score +
        anomalyWeight * anomalyResult.score
    );

    return {
        score: Math.min(100, Math.max(0, fusedScore)),
        flags: [...textResult.flags, ...anomalyResult.flags],
        modelName: "Combined Content Analyzer",
        textSubScore: textResult.score,
        anomalySubScore: anomalyResult.score,
        textResult,
        anomalyResult,
        fusionWeights: { text: textWeight, anomaly: anomalyWeight },
    };
}

// ---- Convenient re-exports so you can also run sub-models directly ----
export { runTextModel, type TextModelResult } from "./textModel";
export { runAnomalyModel, type AnomalyModelResult } from "./anomalyModel";
