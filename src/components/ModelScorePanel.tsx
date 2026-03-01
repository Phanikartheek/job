interface ModelScorePanelProps {
    textScore: number;
    metadataScore: number;
    anomalyScore: number;
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
                    <p className="text-xs text-gray-600">{weight}</p>
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

const ModelScorePanel = ({ textScore, metadataScore, anomalyScore, finalScore }: ModelScorePanelProps) => {
    const finalColor = getFinalColor(finalScore);

    return (
        <div className="rounded-xl bg-black border border-purple-900/30 p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-bold text-white tracking-widest">MODEL SCORE BREAKDOWN</p>
                    <p className="text-xs text-gray-500">Multi-model AI pipeline analysis</p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-gray-500 uppercase tracking-widest">Final Risk Score</p>
                    <p className={`text-4xl font-extrabold ${finalColor}`}>{finalScore}</p>
                    <p className="text-xs text-gray-600">/ 100</p>
                </div>
            </div>

            {/* Formula display */}
            <div className="px-4 py-2 rounded-lg bg-gray-900 border border-purple-900/20 text-center">
                <p className="text-xs text-gray-500 font-mono">
                    Final = <span className="text-purple-400">(0.6 × Text)</span> + <span className="text-blue-400">(0.3 × Metadata)</span> + <span className="text-teal-400">(0.1 × Anomaly)</span>
                    <span className="text-white ml-2">= {finalScore}</span>
                </p>
            </div>

            {/* Score bars */}
            <div className="space-y-5">
                <ScoreBar
                    label="RoBERTa Text Model"
                    sublabel="NLP-based fraud pattern detection"
                    score={textScore}
                    weight="Weight: 60%"
                />
                <ScoreBar
                    label="Metadata Neural Network"
                    sublabel="Salary, location & contact analysis"
                    score={metadataScore}
                    weight="Weight: 30%"
                />
                <ScoreBar
                    label="Isolation Forest"
                    sublabel="Anomaly & outlier detection"
                    score={anomalyScore}
                    weight="Weight: 10%"
                />
            </div>
        </div>
    );
};

export default ModelScorePanel;
