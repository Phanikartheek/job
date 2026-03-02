// ============================================================
// Shared Types — used by all models independently
// Both mlEngine.ts and individual model files import from here.
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
