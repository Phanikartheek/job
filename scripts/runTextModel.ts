// ============================================================
// RUN SCRIPT — RoBERTa Text Model (Standalone)
// Run with:  npx tsx scripts/runTextModel.ts
// ============================================================

import { runTextModel } from "../src/lib/models/textModel";
import type { JobInput } from "../src/lib/models/types";

// ---- Test Cases ----
const testCases: { label: string; job: JobInput }[] = [
    {
        label: "🔴 SCAM JOB (should score HIGH)",
        job: {
            title: "Data Entry Agent",
            company: "XYZ Corp",
            description: "No experience required. Work from home. Earn $ 5000 per week guaranteed. Unlimited income. Same day pay. Whatsapp only for contact. No interview needed. Send money for training materials.",
            requirements: "No skills needed. Training provided free.",
        },
    },
    {
        label: "🟢 LEGITIMATE JOB (should score LOW)",
        job: {
            title: "Senior Software Engineer",
            company: "Google LLC",
            location: "Bangalore, India",
            salary: "$120,000/year",
            description: "We are looking for an experienced software engineer to join our team. You will collaborate with cross-functional teams using agile methodologies. We offer competitive salary, health insurance, 401k, equity, stock options, paid time off, mentorship, and career growth opportunities. Annual leave and performance reviews are part of our culture.",
            requirements: "5+ years experience in TypeScript, React, Node.js. Strong team player with excellent communication skills.",
        },
    },
    {
        label: "🟡 BORDERLINE JOB (medium risk)",
        job: {
            title: "Sales Executive",
            company: "FastGrow",
            location: "Remote",
            salary: "Commission-based",
            description: "Immediate start required. Urgent hiring. Be your own boss and achieve financial freedom. Work from home. No interview process.",
            requirements: "No experience required.",
        },
    },
];

// ---- Run the Text Model ----
console.log("\n════════════════════════════════════════════════════");
console.log("   RoBERTa Text Analyzer — Standalone Test Runner");
console.log("════════════════════════════════════════════════════\n");

for (const { label, job } of testCases) {
    const result = runTextModel(job);

    console.log(`${label}`);
    console.log(`  Model:          ${result.modelName}`);
    console.log(`  Score:          ${result.score}/100`);
    console.log(`  Safe hits:      ${result.safeKeywordsHit} safe keywords found`);
    console.log(`  Fraud keywords: ${result.fraudKeywordsHit.length > 0 ? result.fraudKeywordsHit.join(", ") : "None"}`);

    if (result.flags.length > 0) {
        console.log("  ⚠️  Flags:");
        result.flags.forEach((f) => console.log(`      • ${f}`));
    } else {
        console.log("  ✅ No fraud flags detected");
    }

    console.log("─────────────────────────────────────────────────\n");
}

console.log("✅ textModel.ts ran successfully as a standalone module.\n");
