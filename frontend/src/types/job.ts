/**
 * Shared Types for RecruitGuard UI and API
 */

export interface JobInput {
    title?: string;
    company?: string;
    location?: string;
    salary?: string;
    description?: string;
    requirements?: string;
    email?: string;
}

export interface AnalysisResult {
    isFake: boolean;
    confidence: number;
    textScore: number;
    anomalyScore: number;
    metadataScore: number;
    contentScore: number;
    xgboostScore: number;
    finalScore: number;
    riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    factors: string[];
    insights?: Array<{ type: string; msg: string }>;
    llmExplanation: string;
    shapExplanation?: any;
    status: string;
}
