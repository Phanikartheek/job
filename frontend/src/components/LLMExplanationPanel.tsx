import { Brain, Bot } from "lucide-react";
import { useEffect, useState } from "react";

interface LLMExplanationPanelProps {
    explanation: string;
    riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

const riskConfig = {
    LOW: { label: "LOW RISK", bg: "bg-green-900/30", border: "border-green-700/40", badge: "bg-green-700", text: "text-green-400" },
    MEDIUM: { label: "MEDIUM RISK", bg: "bg-yellow-900/30", border: "border-yellow-700/40", badge: "bg-yellow-600", text: "text-yellow-400" },
    HIGH: { label: "HIGH RISK", bg: "bg-orange-900/30", border: "border-orange-700/40", badge: "bg-orange-600", text: "text-orange-400" },
    CRITICAL: { label: "CRITICAL RISK", bg: "bg-red-900/30", border: "border-red-700/40", badge: "bg-red-600", text: "text-red-400" },
};

const LLMExplanationPanel = ({ explanation, riskLevel }: LLMExplanationPanelProps) => {
    const cfg = riskConfig[riskLevel];
    const [displayed, setDisplayed] = useState("");
    const [done, setDone] = useState(false);

    // Typewriter animation
    useEffect(() => {
        setDisplayed("");
        setDone(false);
        let i = 0;
        const interval = setInterval(() => {
            if (i < explanation.length) {
                setDisplayed(explanation.slice(0, i + 1));
                i++;
            } else {
                setDone(true);
                clearInterval(interval);
            }
        }, 12);
        return () => clearInterval(interval);
    }, [explanation]);

    return (
        <div className={`rounded-xl border p-6 ${cfg.bg} ${cfg.border} space-y-4`}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-700/50">
                        <Brain className="w-5 h-5 text-purple-300" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white tracking-widest">LLM EXPLANATION ENGINE</p>
                        <p className="text-xs text-gray-500">AI-generated analysis</p>
                    </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold text-white tracking-widest ${cfg.badge}`}>
                    {cfg.label}
                </span>
            </div>

            {/* Explanation text */}
            <div className="bg-black/40 rounded-lg p-4 border border-white/5">
                <div className="flex items-start gap-2">
                    <Bot className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cfg.text}`} />
                    <p className="text-sm text-gray-300 leading-relaxed font-mono">
                        {displayed}
                        {!done && <span className="animate-pulse text-purple-400">▌</span>}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LLMExplanationPanel;
