interface ModelScorePanelProps {
    textScore: number;
    metadataScore: number;
    anomalyScore: number;
    contentScore?: number;
    xgboostScore?: number;
    finalScore: number;
}

const getScoreColor = (score: number) => {
    if (score < 25) return { bar: "bg-green-500", text: "text-green-400" };
    if (score < 50) return { bar: "bg-yellow-500", text: "text-yellow-400" };
    if (score < 75) return { bar: "bg-orange-500", text: "text-orange-400" };
    return { bar: "bg-red-500", text: "text-red-400" };
};

const getFinalColor = (score: number) => {
    if (score < 25) return "text-green-400";
    if (score < 50) return "text-yellow-400";
    if (score < 75) return "text-orange-400";
    return "text-red-400";
};

const ScoreBar = ({
    label,
    sublabel,
    score,
    weight,
}: {
    label: string;
    sublabel: string;
    score: number;
    weight: string;
}) => {
    const colors = getScoreColor(score);
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-semibold text-white tracking-wide">{label}</p>
                    <p className="text-xs text-gray-500">{sublabel}</p>
                </div>
                <div className="text-right">
                    <span className={`text-lg font-bold ${colors.text}`}>{score}</span>
                    <span className="text-xs text-gray-600 ml-1">/ 100</span>
                    {weight && <p className="text-xs text-gray-600">{weight}</p>}
                </div>
            </div>
            <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                    className={`h-full ${colors.bar} rounded-full transition-all duration-1000 ease-out`}
                    style={{ width: `${score}%` }}
                />
            </div>
        </div>
    );
};

const ModelScorePanel = ({ textScore, metadataScore, anomalyScore, contentScore, xgboostScore, finalScore }: ModelScorePanelProps) => {
    const finalColor = getFinalColor(finalScore);

    return (
        <div className="rounded-xl bg-black border border-orange-900/40 p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-orange-900/30 pb-4">
                <div>
                    <p className="text-sm font-bold text-white tracking-widest">5-MODEL AI PIPELINE</p>
                    <p className="text-xs text-orange-500/80 mt-1">Full stack diagnostic view</p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-gray-500 uppercase tracking-widest">Ensemble Final</p>
                    <p className={`text-4xl font-extrabold ${finalColor}`}>{finalScore}</p>
                </div>
            </div>

            {/* Formula display */}
            <div className="px-4 py-3 rounded-lg bg-gray-900 border border-orange-900/20 text-center font-mono text-[11px] sm:text-xs">
                <span className="text-gray-500">FINAL SCORE = </span>
                <span className="text-blue-400">(0.4 × Content)</span> <span className="text-gray-600">+</span>{" "}
                <span className="text-purple-400">(0.3 × Metadata)</span> <span className="text-gray-600">+</span>{" "}
                <span className="text-red-400">(0.3 × XGBoost)</span>
            </div>

            {/* Score bars for the 5 models */}
            <div className="space-y-5 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div className="space-y-6">
                        <ScoreBar
                            label="1. TF-IDF Text Analyzer"
                            sublabel="NLP linguistic fraud pattern detection"
                            score={textScore}
                            weight="→ Feeds Model 4"
                        />
                        <ScoreBar
                            label="2. Isolation Forest"
                            sublabel="Structural anomaly & outlier detection"
                            score={anomalyScore}
                            weight="→ Feeds Model 4"
                        />
                        <ScoreBar
                            label="4. Content Fusion"
                            sublabel="Weighted fusion of Text (75%) & Anomaly (25%)"
                            score={contentScore ?? Math.round(textScore * 0.75 + anomalyScore * 0.25)}
                            weight="Weight: 40%"
                        />
                    </div>
                    <div className="space-y-6">
                        <ScoreBar
                            label="3. Metadata Neural Net"
                            sublabel="Salary, location & contact analysis"
                            score={metadataScore}
                            weight="Weight: 30%"
                        />
                        <ScoreBar
                            label="5. XGBoost Ensemble"
                            sublabel="Gradient boosting decision refinement"
                            score={xgboostScore ?? finalScore} /* Fallback if missing */
                            weight="Weight: 30%"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ModelScorePanel;
