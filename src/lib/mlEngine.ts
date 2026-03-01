// ============================================================
// Mock ML Engine — Simulates the 4-component AI pipeline
// RoBERTa (Text) + Metadata NN + Isolation Forest + LLM Explanation
// Final Score = (0.6 × TextScore) + (0.3 × MetadataScore) + (0.1 × AnomalyScore)
// ============================================================

export interface JobInput {
    title?: string;
    company?: string;
    location?: string;
    salary?: string;
    description?: string;
    requirements?: string;
    email?: string;
}

export interface MLScores {
    textScore: number;       // RoBERTa-like (0–100, higher = more fraudulent)
    metadataScore: number;   // Metadata NN (0–100)
    anomalyScore: number;    // Isolation Forest (0–100)
    finalScore: number;      // Weighted composite
    riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    factors: string[];
    llmExplanation: string;
}

// ---------- Red-Flag keyword lists ----------
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

const SUSPICIOUS_DOMAINS = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com"];

// ---------- 1. RoBERTa Text Score ----------
export function analyzeText(job: JobInput): { score: number; flags: string[] } {
    const text = [job.title, job.description, job.requirements, job.company]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

    const flags: string[] = [];
    let score = 0;

    // Fraud keyword hits
    for (const kw of FRAUD_KEYWORDS) {
        if (text.includes(kw)) {
            score += 12;
            flags.push(`Suspicious phrase detected: "${kw}"`);
        }
    }

    // Safe keyword presence reduces score
    let safeHits = 0;
    for (const kw of SAFE_KEYWORDS) {
        if (text.includes(kw)) safeHits++;
    }
    score -= safeHits * 3;

    // Very short description (vague posting)
    const descLength = (job.description || "").length;
    if (descLength < 100) {
        score += 20;
        flags.push("Job description is suspiciously short or vague");
    } else if (descLength > 600) {
        score -= 5;
    }

    // Excessive punctuation / caps (scam pattern)
    const excessCaps = (text.match(/[A-Z]{4,}/g) || []).length;
    if (excessCaps > 3) {
        score += 8;
        flags.push("Excessive capitalization detected (common in scam postings)");
    }

    return { score: Math.min(100, Math.max(0, score)), flags };
}

// ---------- 2. Metadata Neural Network Score ----------
export function analyzeMetadata(job: JobInput): { score: number; flags: string[] } {
    const flags: string[] = [];
    let score = 0;

    // Salary analysis
    const salaryStr = (job.salary || "").toLowerCase();
    if (!salaryStr) {
        score += 15;
        flags.push("No salary information provided");
    } else {
        // Unrealistically high salary claims
        const matches = salaryStr.match(/\$?([\d,]+)/g);
        if (matches) {
            const amounts = matches.map((m) => parseFloat(m.replace(/[$,]/g, "")));
            const maxAmt = Math.max(...amounts);
            if (maxAmt > 10000 && salaryStr.includes("week")) {
                score += 35;
                flags.push("Unrealistically high weekly salary claim");
            } else if (maxAmt > 50000 && salaryStr.includes("month")) {
                score += 25;
                flags.push("Unrealistically high monthly salary claim");
            }
        }
        if (salaryStr.includes("unlimited") || salaryStr.includes("uncapped")) {
            score += 20;
            flags.push("Vague 'unlimited earnings' salary claim");
        }
    }

    // Email domain analysis
    if (job.email) {
        const domain = job.email.split("@")[1]?.toLowerCase() || "";
        if (SUSPICIOUS_DOMAINS.some((d) => domain.includes(d))) {
            score += 20;
            flags.push(`Contact email uses personal domain: ${domain}`);
        }
    } else if ((job.description || "").match(/@(gmail|yahoo|hotmail|outlook)\./i)) {
        score += 15;
        flags.push("Personal email domain found in job description");
    }

    // Location analysis
    const location = (job.location || "").toLowerCase();
    if (!location || location === "anywhere" || location === "any location") {
        score += 10;
        flags.push("No specific location or vague location provided");
    }

    // Company legitimacy check (very generic name)
    const company = (job.company || "").toLowerCase();
    if (!company || company.length < 3) {
        score += 15;
        flags.push("Company name is missing or suspiciously short");
    }

    return { score: Math.min(100, Math.max(0, score)), flags };
}

// ---------- 3. Isolation Forest Anomaly Score ----------
export function analyzeAnomaly(job: JobInput): { score: number; flags: string[] } {
    const flags: string[] = [];
    let score = 0;

    const text = [job.title, job.description, job.requirements]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

    // Title doesn't match description
    const title = (job.title || "").toLowerCase();
    if (title.includes("data entry") && text.includes("sales")) {
        score += 15;
        flags.push("Job title and description appear mismatched");
    }

    // Strange requirement combinations
    if (text.includes("no experience") && text.includes("high salary")) {
        score += 20;
        flags.push("Contradiction: 'no experience required' with unusually high salary");
    }

    // Extremely short title
    if ((job.title || "").length < 5) {
        score += 10;
        flags.push("Job title is unusually short");
    }

    // Upfront cost indicators
    if (text.match(/(pay|fee|deposit|investment).{0,30}(start|begin|join)/)) {
        score += 40;
        flags.push("Upfront payment requirement detected — strong fraud signal");
    }

    // Contact-only-via-app pattern
    if (text.match(/(whatsapp|telegram|wechat|signal).{0,20}(only|contact|reach)/)) {
        score += 25;
        flags.push("Communication restricted to messaging apps only");
    }

    return { score: Math.min(100, Math.max(0, score)), flags };
}

// ---------- 4. Weighted Score + Risk Level ----------
export function computeFinalScore(
    textScore: number,
    metadataScore: number,
    anomalyScore: number
): number {
    return Math.round(0.6 * textScore + 0.3 * metadataScore + 0.1 * anomalyScore);
}

function getRiskLevel(score: number): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
    if (score < 25) return "LOW";
    if (score < 50) return "MEDIUM";
    if (score < 75) return "HIGH";
    return "CRITICAL";
}

// ---------- 5. LLM Explanation Generator ----------
function generateExplanation(
    job: JobInput,
    scores: { text: number; metadata: number; anomaly: number; final: number },
    allFlags: string[]
): string {
    const risk = getRiskLevel(scores.final);
    const company = job.company || "this company";
    const title = job.title || "this position";

    if (risk === "LOW") {
        return (
            `The job posting for "${title}" at ${company} shows low fraud risk indicators. ` +
            `The RoBERTa text analysis found no suspicious language patterns (score: ${scores.text}/100), ` +
            `the metadata neural network detected legitimate salary and contact information (score: ${scores.metadata}/100), ` +
            `and the Isolation Forest anomaly detector found no unusual structural patterns (score: ${scores.anomaly}/100). ` +
            `The composite fraud risk score of ${scores.final}/100 places this posting in the SAFE category. ` +
            `Standard job-seeker precautions (verifying the company's official website before applying) are still recommended.`
        );
    }

    if (risk === "MEDIUM") {
        const topFlag = allFlags[0] || "some ambiguous signals";
        return (
            `The job posting for "${title}" at ${company} shows moderate fraud risk. ` +
            `The primary concern identified by the AI pipeline is: ${topFlag}. ` +
            `Text-based analysis scored ${scores.text}/100, metadata scoring returned ${scores.metadata}/100, ` +
            `and anomaly detection raised ${scores.anomaly}/100. ` +
            `Final composite score: ${scores.final}/100 (MEDIUM risk). ` +
            `Recommendation: Verify the employer's identity through official channels before proceeding. ` +
            `Do not share personal financial information until legitimacy is confirmed.`
        );
    }

    if (risk === "HIGH") {
        return (
            `⚠️ HIGH FRAUD RISK detected for "${title}" at ${company}. ` +
            `Multiple AI models flagged this posting: Text model (${scores.text}/100), Metadata model (${scores.metadata}/100), ` +
            `Anomaly detector (${scores.anomaly}/100). ` +
            `Key red flags include: ${allFlags.slice(0, 3).join("; ")}. ` +
            `The composite risk score of ${scores.final}/100 strongly suggests this is a fraudulent posting. ` +
            `Do NOT apply, send money, or share documents. Cross-reference the company through official government/business registries.`
        );
    }

    // CRITICAL
    return (
        `🚨 CRITICAL FRAUD ALERT for "${title}" at ${company}. ` +
        `All three AI detection models returned high-risk scores: ` +
        `RoBERTa text model: ${scores.text}/100, Metadata neural network: ${scores.metadata}/100, ` +
        `Isolation Forest anomaly score: ${scores.anomaly}/100. ` +
        `Final fraud risk score: ${scores.final}/100 — this posting matches patterns of known recruitment scams. ` +
        `Detected indicators: ${allFlags.slice(0, 4).join("; ")}. ` +
        `IMMEDIATE ACTION: Do not respond to this posting. Block and report the sender. ` +
        `Never transfer money, share banking details, or provide government ID to unverified employers.`
    );
}

// ---------- Main Analysis Function ----------
export function analyzeJob(job: JobInput): MLScores {
    const textResult = analyzeText(job);
    const metaResult = analyzeMetadata(job);
    const anomalyResult = analyzeAnomaly(job);

    const finalScore = computeFinalScore(
        textResult.score,
        metaResult.score,
        anomalyResult.score
    );

    const allFlags = [...textResult.flags, ...metaResult.flags, ...anomalyResult.flags];
    const riskLevel = getRiskLevel(finalScore);
    const llmExplanation = generateExplanation(
        job,
        { text: textResult.score, metadata: metaResult.score, anomaly: anomalyResult.score, final: finalScore },
        allFlags
    );

    return {
        textScore: textResult.score,
        metadataScore: metaResult.score,
        anomalyScore: anomalyResult.score,
        finalScore,
        riskLevel,
        factors: allFlags,
        llmExplanation,
    };
}
