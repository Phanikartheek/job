import { ThreatBadge } from "./ui/ThreatBadge";
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  FileText,
} from "lucide-react";
import ModelScorePanel from "@/components/ModelScorePanel";
import LLMExplanationPanel from "@/components/LLMExplanationPanel";

interface ExtractedData {
  title: string | null;
  company: string | null;
  location: string | null;
  salary: string | null;
  description: string;
}

interface AnalysisResultProps {
  result: {
    isFake: boolean;
    confidence: number;
    factors: string[];
    extractedData?: ExtractedData;
    // Extended ML scores (optional, from mock engine)
    textScore?: number;
    metadataScore?: number;
    anomalyScore?: number;
    llmExplanation?: string;
  };
}

const AnalysisResult = ({ result }: AnalysisResultProps) => {
  const { isFake, confidence, factors, extractedData, textScore, metadataScore, anomalyScore, llmExplanation } = result;

  // Derive model scores from confidence if not explicitly provided
  const hasMLScores = textScore !== undefined && metadataScore !== undefined && anomalyScore !== undefined;
  const finalScore = hasMLScores
    ? Math.round(0.6 * textScore! + 0.3 * metadataScore! + 0.1 * anomalyScore!)
    : confidence;
  const riskLevel =
    finalScore < 25 ? "LOW" : finalScore < 50 ? "MEDIUM" : finalScore < 75 ? "HIGH" : "CRITICAL";

  const defaultExplanation = isFake
    ? `Fraud risk analysis flagged this job posting with ${confidence}% confidence. Key risk indicators include suspicious language patterns, potential salary misrepresentation, or metadata anomalies. Do NOT share personal information or send money to this employer.`
    : `No major fraud signals detected. The posting appears legitimate with ${confidence}% confidence. As always, verify the employer through official channels before submitting personal documents.`;

  return (
    <div className="mt-10 space-y-8">

      {/* =======================
          MAIN THREAT PANEL
      ======================== */}
      <div
        className={`p-8 rounded-2xl border shadow-elevated ${isFake
            ? "bg-black border-red-800/40 shadow-danger"
            : "bg-black border-green-800/40"
          }`}
      >
        {/* HEADER */}
        <div className="flex items-center gap-5 mb-8">
          <div
            className={`p-5 rounded-xl ${isFake
                ? "bg-red-600 animate-alert-pulse"
                : "bg-green-600"
              }`}
          >
            {isFake ? (
              <AlertTriangle className="w-10 h-10 text-white" />
            ) : (
              <Shield className="w-10 h-10 text-white" />
            )}
          </div>

          <div className="flex flex-col gap-3">
            <h3
              className={`text-3xl font-extrabold tracking-widest ${isFake ? "text-red-500" : "text-green-500"
                }`}
            >
              {isFake ? "THREAT DETECTED" : "NO FRAUD SIGNALS"}
            </h3>

            {/* Threat Badge */}
            <ThreatBadge fraud={isFake} confidence={confidence} />

            <p className="text-gray-400 text-sm tracking-wide">
              ML CONFIDENCE LEVEL: {confidence}%
            </p>
          </div>
        </div>

        {/* CONFIDENCE BAR */}
        <div className="mb-8">
          <div className="flex justify-between text-xs uppercase tracking-wider text-gray-500 mb-2">
            <span>Confidence</span>
            <span>{confidence}%</span>
          </div>

          <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ${isFake
                  ? "bg-red-600 shadow-danger"
                  : "bg-green-600"
                }`}
              style={{ width: `${confidence}%` }}
            />
          </div>
        </div>

        {/* ANALYSIS FACTORS */}
        <div>
          <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">
            Risk Analysis Factors
          </h4>

          <div className="space-y-3">
            {factors.map((factor, index) => (
              <div
                key={index}
                className={`flex items-center gap-3 p-4 bg-gray-900 rounded-lg ${isFake
                    ? "border border-red-900/20"
                    : "border border-green-900/20"
                  }`}
              >
                {isFake ? (
                  <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                )}
                <span className="text-gray-300 text-sm tracking-wide">
                  {factor}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* RECOMMENDATION */}
        <div
          className={`mt-8 p-5 rounded-xl ${isFake
              ? "bg-gray-900 border border-red-900/30"
              : "bg-gray-900 border border-green-900/30"
            }`}
        >
          <div className="flex items-start gap-4">
            <Info className={`w-6 h-6 flex-shrink-0 ${isFake ? "text-red-500" : "text-green-500"
              }`} />
            <div>
              <h4 className="font-bold text-white mb-2 tracking-widest">
                SECURITY RECOMMENDATION
              </h4>
              <p className="text-sm text-gray-400 leading-relaxed">
                {isFake
                  ? "High-risk indicators detected. Do NOT send money, share personal documents, or communicate outside verified company channels. Cross-check the employer via official sources immediately."
                  : "No major fraud indicators detected. However, always verify employer authenticity through official websites and avoid sharing sensitive information prematurely."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* =======================
          MODEL SCORE PANEL (AI Pipeline Breakdown)
      ======================== */}
      <ModelScorePanel
        textScore={hasMLScores ? textScore! : Math.min(100, confidence + 5)}
        metadataScore={hasMLScores ? metadataScore! : Math.max(0, confidence - 10)}
        anomalyScore={hasMLScores ? anomalyScore! : Math.round(confidence * 0.7)}
        finalScore={hasMLScores ? finalScore : confidence}
      />

      {/* =======================
          LLM EXPLANATION PANEL
      ======================== */}
      <LLMExplanationPanel
        explanation={llmExplanation || defaultExplanation}
        riskLevel={isFake ? (confidence >= 75 ? "CRITICAL" : "HIGH") : riskLevel as any}
      />

      {/* =======================
          EXTRACTED DATA PANEL
      ======================== */}
      {extractedData && (
        <div
          className={`p-6 rounded-2xl bg-black shadow-card ${isFake
              ? "border border-red-900/30"
              : "border border-green-900/30"
            }`}
        >
          <div className="flex items-center gap-3 mb-6">
            <FileText className={`w-6 h-6 ${isFake ? "text-red-500" : "text-green-500"
              }`} />
            <h4 className="text-xl font-bold text-white tracking-widest">
              EXTRACTED JOB DATA
            </h4>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 text-sm">
            <div>
              <p className="text-gray-500 uppercase tracking-widest text-xs">
                Job Title
              </p>
              <p className="text-white font-medium">
                {extractedData.title || "Not detected"}
              </p>
            </div>

            <div>
              <p className="text-gray-500 uppercase tracking-widest text-xs">
                Company
              </p>
              <p className="text-white font-medium">
                {extractedData.company || "Not detected"}
              </p>
            </div>

            <div>
              <p className="text-gray-500 uppercase tracking-widest text-xs">
                Location
              </p>
              <p className="text-white font-medium">
                {extractedData.location || "Not specified"}
              </p>
            </div>

            <div>
              <p className="text-gray-500 uppercase tracking-widest text-xs">
                Salary
              </p>
              <p className="text-white font-medium">
                {extractedData.salary || "Not specified"}
              </p>
            </div>
          </div>

          {extractedData.description && (
            <div className="mt-6">
              <p className="text-gray-500 uppercase tracking-widest text-xs mb-2">
                Description Summary
              </p>
              <p className="text-gray-400 text-sm leading-relaxed">
                {extractedData.description}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AnalysisResult;
