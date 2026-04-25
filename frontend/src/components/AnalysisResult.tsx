import { useEffect, useRef, useState } from "react";
import { ThreatBadge } from "./ui/ThreatBadge";
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  FileText,
  ThumbsUp,
  ThumbsDown
} from "lucide-react";
import ModelScorePanel from "@/components/ModelScorePanel";
import LLMExplanationPanel from "@/components/LLMExplanationPanel";
import DownloadReportButton from "@/components/DownloadReportButton";
import { RiskRadar } from "./RiskRadar";
import { InsightCard } from "./InsightCard";
import { submitFeedback } from "@/lib/mlEngine";
import { toast } from "sonner";

// --------------- Animated Risk Gauge ---------------
const RADIUS = 52;
const CIRC = 2 * Math.PI * RADIUS;

function getRiskColor(score: number): string {
  if (score < 25) return "#22c55e";   // green
  if (score < 50) return "#eab308";   // yellow
  if (score < 75) return "#f97316";   // orange
  return "#ef4444";                   // red
}

const RiskGauge = ({ score }: { score: number }) => {
  const circleRef = useRef<SVGCircleElement>(null);
  const color = getRiskColor(score);
  const riskLabel = score < 25 ? "LOW" : score < 50 ? "MEDIUM" : score < 75 ? "HIGH" : "CRITICAL";

  useEffect(() => {
    const el = circleRef.current;
    if (!el) return;
    // Start from 0 then animate to target
    el.style.strokeDashoffset = String(CIRC);
    const target = CIRC - (score / 100) * CIRC;
    requestAnimationFrame(() => {
      el.style.transition = "stroke-dashoffset 1.4s cubic-bezier(0.4, 0, 0.2, 1)";
      el.style.strokeDashoffset = String(target);
    });
  }, [score]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          {/* Background track */}
          <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="#1f2937" strokeWidth="10" />
          {/* Animated fill */}
          <circle
            ref={circleRef}
            cx="60" cy="60" r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC}
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>
        {/* Centre score */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold" style={{ color }}>{score}</span>
          <span className="text-xs text-gray-400 tracking-widest">/100</span>
        </div>
      </div>
      <span
        className="text-xs font-bold tracking-widest px-3 py-1 rounded-full border"
        style={{ color, borderColor: color, backgroundColor: `${color}15` }}
      >
        {riskLabel} RISK
      </span>
    </div>
  );
};

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
    insights?: Array<{ type: string; msg: string }>;
    extractedData?: ExtractedData;
    // Extended ML scores (optional, from mock engine)
    textScore?: number;
    metadataScore?: number;
    anomalyScore?: number;
    contentScore?: number;
    xgboostScore?: number;
    llmExplanation?: string;
  };
}

const AnalysisResult = ({ result }: AnalysisResultProps) => {
  const [feedbackSent, setFeedbackSent] = useState(false);
  const { isFake, confidence, factors, insights, extractedData, textScore, metadataScore, anomalyScore, contentScore, xgboostScore, llmExplanation } = result;

  // Derive model scores from confidence if not explicitly provided
  const hasMLScores = textScore !== undefined && metadataScore !== undefined && anomalyScore !== undefined;
  const finalScore = hasMLScores
    ? Math.round(0.7 * textScore! + 0.3 * metadataScore!)
    : confidence;
  const riskLevel =
    finalScore < 25 ? "LOW" : finalScore < 50 ? "MEDIUM" : finalScore < 75 ? "HIGH" : "CRITICAL";

  const defaultExplanation = isFake
    ? `Fraud risk analysis flagged this job posting with ${confidence}% confidence. Key risk indicators include suspicious language patterns, potential salary misrepresentation, or metadata anomalies. Do NOT share personal information or send money to this employer.`
    : `No major fraud signals detected. The posting appears legitimate with ${confidence}% confidence. As always, verify the employer through official channels before submitting personal documents.`;

  const handleFeedback = async (label: 'fraud' | 'legit') => {
    await submitFeedback(label);
    setFeedbackSent(true);
    toast.success("Feedback saved! The AI is learning.");
  };

  return (
    <div className="mt-10 space-y-8 animate-fade-in">

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
        <div className="flex items-start justify-between gap-5 mb-8 flex-wrap">
          <div className="flex items-center gap-5">
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

          {/* Animated Risk Gauge */}
          <RiskGauge score={hasMLScores ? finalScore : confidence} />
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

        {/* AI REASONING ENGINE (NEW) */}
        {insights && insights.length > 0 ? (
          <InsightCard insights={insights} />
        ) : (
          <div>
            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">
              Risk Analysis Factors
            </h4>

            <div className="space-y-3">
              {(factors || []).map((factor, index) => (
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
        )}

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
              {!isFake && (
                <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-orange-400/90 leading-relaxed">
                    <strong className="text-orange-500">SOPHISTICATED SCAM WARNING:</strong> 
                    {" "}Professionally written fake jobs can bypass AI text detection. Always verify the company's legal existence (e.g., via MCA India) before proceeding.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =======================
          RISK RADAR (NEW)
      ======================== */}
      {hasMLScores && (
         <RiskRadar data={{
           text: textScore || 0,
           anomaly: anomalyScore || 0,
           metadata: metadataScore || 0,
           content: contentScore || 0,
           xgboost: xgboostScore || 0
         }} />
      )}

      {/* =======================
          FEEDBACK LEARNING LOOP (NEW)
      ======================== */}
      {!feedbackSent && (
        <div className="p-6 rounded-2xl bg-orange-500/5 border border-orange-500/20 shadow-card flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Shield className="w-16 h-16 text-orange-500" />
          </div>
          <div className="relative z-10">
            <p className="text-sm font-bold text-orange-400 tracking-wide">ACTIVE LEARNING LOOP</p>
            <p className="text-xs text-white/60 mt-1 max-w-[280px]">Your feedback is logged into the system and used to retrain the models, improving future detection.</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => handleFeedback('legit')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-500 text-sm transition-colors"
            >
              <ThumbsUp className="w-4 h-4" /> Legit Job
            </button>
            <button 
              onClick={() => handleFeedback('fraud')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 text-sm transition-colors"
            >
              <ThumbsDown className="w-4 h-4" /> Fraudulent
            </button>
          </div>
        </div>
      )}

      {/* =======================
          MODEL SCORE PANEL (Legacy Fallback)
      ======================== */}
      {!hasMLScores && (
        <ModelScorePanel
          textScore={Math.min(100, confidence + 5)}
          metadataScore={Math.max(0, confidence - 10)}
          anomalyScore={Math.round(confidence * 0.7)}
          contentScore={result.contentScore}
          xgboostScore={result.xgboostScore}
          finalScore={confidence}
        />
      )}

      {/* =======================
          LLM EXPLANATION PANEL
      ======================== */}
      <LLMExplanationPanel
        explanation={llmExplanation || defaultExplanation}
        riskLevel={isFake ? (confidence >= 75 ? "CRITICAL" : "HIGH") : riskLevel as any}
      />

      {/* =======================
          DOWNLOAD REPORT BUTTON
      ======================== */}
      <div className="flex justify-end">
        <DownloadReportButton
          data={[]}
          singleJob={{
            title: extractedData?.title || "Job Analysis",
            company: extractedData?.company || "Unknown Company",
            location: extractedData?.location || undefined,
            salary: extractedData?.salary || undefined,
            finalScore: hasMLScores ? finalScore : confidence,
            riskLevel,
            factors,
            llmExplanation: llmExplanation || defaultExplanation,
            textScore: hasMLScores ? textScore! : Math.min(100, confidence + 5),
            metadataScore: hasMLScores ? metadataScore! : Math.max(0, confidence - 10),
            anomalyScore: hasMLScores ? anomalyScore! : Math.round(confidence * 0.7),
          }}
        />
      </div>

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
              <div className="flex items-center justify-between">
                <p className="text-gray-500 uppercase tracking-widest text-xs">
                  Company
                </p>
                {extractedData.company && (
                  <a 
                    href="https://www.mca.gov.in/content/mca/global/en/mca/master-data/MDS.html" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-orange-500 hover:text-orange-400 text-[10px] uppercase font-bold tracking-widest flex items-center gap-1 bg-orange-500/10 px-2 py-0.5 rounded transition-colors"
                  >
                    Verify on MCA
                  </a>
                )}
              </div>
              <p className="text-white font-medium mt-1">
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
