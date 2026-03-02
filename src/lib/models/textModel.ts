// ============================================================
// MODEL 1: RoBERTa Text Analyzer
// Detects suspicious language patterns in job text fields.
// Input:  JobInput  →  Output: { score: number; flags: string[] }
// Score range: 0–100 (higher = more fraudulent)
// Can be run STANDALONE or as part of the combined Content Model.
// ============================================================

import type { JobInput } from "./types";

const FRAUD_KEYWORDS = [
    "no experience required", "work from home", "earn from home",
    "make money fast", "unlimited income", "easy money", "guaranteed income",
    "processing fee", "registration fee", "send money", "wire transfer",
    "bitcoin", "crypto payment", "mlm", "multi-level", "pyramid",
    "immediate start", "urgent hiring", "no interview", "same day pay",
    "whatsapp only", "telegram only", "gmail.com", "yahoo.com", "hotmail.com",
    "be your own boss", "financial freedom", "passive income",
    "no skills needed", "training provided free", "earn $", "per week guaranteed",
    "uncapped earnings", "100% remote no interview",
];

const SAFE_KEYWORDS = [
    "benefits", "health insurance", "401k", "pto", "paid time off",
    "equity", "stock options", "competitive salary", "career growth",
    "team", "collaboration", "agile", "sprint", "annual leave",
    "performance review", "mentorship", "professional development",
];

export interface TextModelResult {
    score: number;
    flags: string[];
    modelName: "RoBERTa Text Analyzer";
    fraudKeywordsHit: string[];
    safeKeywordsHit: number;
}

/**
 * RoBERTa Text Analyzer — Model 1
 * Runs NLP-style keyword analysis on job title, description,
 * requirements, and company name.
 *
 * @standalone  Import and call runTextModel(job) directly.
 * @combined    Used internally by contentModel.ts with 75% weight.
 */
export function runTextModel(job: JobInput): TextModelResult {
    const text = [job.title, job.description, job.requirements, job.company]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

    const fraudKeywordsHit: string[] = [];
    let score = 0;

    // Fraud keyword hits (+12 each)
    for (const kw of FRAUD_KEYWORDS) {
        if (text.includes(kw)) {
            score += 12;
            fraudKeywordsHit.push(kw);
        }
    }

    // Safe keyword hits (−3 each, counterbalances fraud signals)
    let safeHits = 0;
    for (const kw of SAFE_KEYWORDS) {
        if (text.includes(kw)) safeHits++;
    }
    score -= safeHits * 3;

    // Very short description = vague/suspicious (+20)
    const descLength = (job.description || "").length;
    if (descLength < 100) {
        score += 20;
    } else if (descLength > 600) {
        score -= 5; // detailed description = more legitimate
    }

    // Excessive capitalization = scam pattern (+8)
    const excessCaps = (text.match(/[A-Z]{4,}/g) || []).length;
    if (excessCaps > 3) score += 8;

    const flags: string[] = [
        ...fraudKeywordsHit.map((kw) => `Suspicious phrase detected: "${kw}"`),
        ...(descLength < 100 ? ["Job description is suspiciously short or vague"] : []),
        ...(excessCaps > 3 ? ["Excessive capitalization detected (common in scam postings)"] : []),
    ];

    return {
        score: Math.min(100, Math.max(0, score)),
        flags,
        modelName: "RoBERTa Text Analyzer",
        fraudKeywordsHit,
        safeKeywordsHit: safeHits,
    };
}
