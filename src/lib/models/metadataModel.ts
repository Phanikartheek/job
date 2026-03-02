// ============================================================
// MODEL 3: Metadata Neural Network
// Analyzes structured metadata: salary, email, location, company.
// Input:  JobInput  →  Output: { score: number; flags: string[] }
// Score range: 0–100 (higher = more suspicious metadata)
// Runs STANDALONE — NOT part of the Content Model fusion.
// ============================================================

import type { JobInput } from "./types";

const SUSPICIOUS_DOMAINS = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com"];

export interface MetadataModelResult {
    score: number;
    flags: string[];
    modelName: "Metadata Neural Network";
    salaryFlag: boolean;
    emailFlag: boolean;
    locationFlag: boolean;
    companyFlag: boolean;
}

/**
 * Metadata Neural Network — Model 3
 * Analyzes non-text structured fields: salary range plausibility,
 * email domain legitimacy, location specificity, company name validity.
 *
 * @standalone  Import and call runMetadataModel(job) directly.
 * @orchestrated  Used in mlEngine.ts with 30% weight in final score.
 */
export function runMetadataModel(job: JobInput): MetadataModelResult {
    let score = 0;
    let salaryFlag = false;
    let emailFlag = false;
    let locationFlag = false;
    let companyFlag = false;
    const flags: string[] = [];

    // ---- Salary Analysis ----
    const salaryStr = (job.salary || "").toLowerCase();
    if (!salaryStr) {
        score += 15;
        salaryFlag = true;
        flags.push("No salary information provided");
    } else {
        const matches = salaryStr.match(/\$?([\d,]+)/g);
        if (matches) {
            const amounts = matches.map((m) => parseFloat(m.replace(/[$,]/g, "")));
            const maxAmt = Math.max(...amounts);
            if (maxAmt > 10000 && salaryStr.includes("week")) {
                score += 35;
                salaryFlag = true;
                flags.push("Unrealistically high weekly salary claim");
            } else if (maxAmt > 50000 && salaryStr.includes("month")) {
                score += 25;
                salaryFlag = true;
                flags.push("Unrealistically high monthly salary claim");
            }
        }
        if (salaryStr.includes("unlimited") || salaryStr.includes("uncapped")) {
            score += 20;
            salaryFlag = true;
            flags.push("Vague 'unlimited earnings' salary claim");
        }
    }

    // ---- Email Domain Analysis ----
    if (job.email) {
        const domain = job.email.split("@")[1]?.toLowerCase() || "";
        if (SUSPICIOUS_DOMAINS.some((d) => domain.includes(d))) {
            score += 20;
            emailFlag = true;
            flags.push(`Contact email uses personal domain: ${domain}`);
        }
    } else if ((job.description || "").match(/@(gmail|yahoo|hotmail|outlook)\./i)) {
        score += 15;
        emailFlag = true;
        flags.push("Personal email domain found in job description");
    }

    // ---- Location Analysis ----
    const location = (job.location || "").toLowerCase();
    if (!location || location === "anywhere" || location === "any location") {
        score += 10;
        locationFlag = true;
        flags.push("No specific location or vague location provided");
    }

    // ---- Company Name Analysis ----
    const company = (job.company || "").toLowerCase();
    if (!company || company.length < 3) {
        score += 15;
        companyFlag = true;
        flags.push("Company name is missing or suspiciously short");
    }

    return {
        score: Math.min(100, Math.max(0, score)),
        flags,
        modelName: "Metadata Neural Network",
        salaryFlag,
        emailFlag,
        locationFlag,
        companyFlag,
    };
}
