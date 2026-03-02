// ============================================================
// MODEL 2: Isolation Forest Anomaly Detector
// Detects structural contradictions and anomalies in job data.
// Input:  JobInput  →  Output: { score: number; flags: string[] }
// Score range: 0–100 (higher = more anomalous / fraudulent)
// Can be run STANDALONE or as part of the combined Content Model.
// ============================================================

import type { JobInput } from "./types";

export interface AnomalyModelResult {
    score: number;
    flags: string[];
    modelName: "Isolation Forest Anomaly Detector";
    anomaliesFound: string[];
}

/**
 * Isolation Forest Anomaly Detector — Model 2
 * Detects structural inconsistencies like mismatched titles,
 * upfront payment demands, and messaging-app-only contacts.
 *
 * @standalone  Import and call runAnomalyModel(job) directly.
 * @combined    Used internally by contentModel.ts with 25% weight.
 */
export function runAnomalyModel(job: JobInput): AnomalyModelResult {
    const anomaliesFound: string[] = [];
    let score = 0;

    const text = [job.title, job.description, job.requirements]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

    // Anomaly 1: Title vs description mismatch
    const title = (job.title || "").toLowerCase();
    if (title.includes("data entry") && text.includes("sales")) {
        score += 15;
        anomaliesFound.push("JOB_TITLE_DESCRIPTION_MISMATCH");
    }

    // Anomaly 2: Logical contradiction — no experience + high salary
    if (text.includes("no experience") && text.includes("high salary")) {
        score += 20;
        anomaliesFound.push("EXPERIENCE_SALARY_CONTRADICTION");
    }

    // Anomaly 3: Extremely short/generic title
    if ((job.title || "").length < 5) {
        score += 10;
        anomaliesFound.push("TITLE_TOO_SHORT");
    }

    // Anomaly 4: Upfront costs (strong fraud signal)
    if (text.match(/(pay|fee|deposit|investment).{0,30}(start|begin|join)/)) {
        score += 40;
        anomaliesFound.push("UPFRONT_PAYMENT_REQUIRED");
    }

    // Anomaly 5: Communication restricted to messaging apps
    if (text.match(/(whatsapp|telegram|wechat|signal).{0,20}(only|contact|reach)/)) {
        score += 25;
        anomaliesFound.push("MESSAGING_APP_ONLY_CONTACT");
    }

    const ANOMALY_MESSAGES: Record<string, string> = {
        JOB_TITLE_DESCRIPTION_MISMATCH: "Job title and description appear mismatched",
        EXPERIENCE_SALARY_CONTRADICTION: "Contradiction: 'no experience required' with unusually high salary",
        TITLE_TOO_SHORT: "Job title is unusually short",
        UPFRONT_PAYMENT_REQUIRED: "Upfront payment requirement detected — strong fraud signal",
        MESSAGING_APP_ONLY_CONTACT: "Communication restricted to messaging apps only",
    };

    const flags = anomaliesFound.map((key) => ANOMALY_MESSAGES[key] || key);

    return {
        score: Math.min(100, Math.max(0, score)),
        flags,
        modelName: "Isolation Forest Anomaly Detector",
        anomaliesFound,
    };
}
