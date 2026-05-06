import { BarChart3, HelpCircle, AlertOctagon, Sparkles } from "lucide-react";

interface Driver {
  word: string;
  coef: number;
  tfidf: number;
  shap_value: number;
}

interface MetaContrib {
  feature: string;
  value: number;
  shap_value: number;
  importance?: number;
}

interface SHAPExplanationPanelProps {
  shapData?: {
    text?: {
      fraud_drivers?: Driver[];
      legit_drivers?: Driver[];
      intercept?: number;
    };
    metadata?: {
      contributions?: MetaContrib[];
      base_value?: number;
      fallback?: boolean;
    };
  };
}

const SHAPExplanationPanel = ({ shapData }: SHAPExplanationPanelProps) => {
  if (!shapData || (!shapData.text && !shapData.metadata)) return null;

  const textData = shapData.text;
  const metaData = shapData.metadata;

  const hasTextDrivers = textData?.fraud_drivers && textData.fraud_drivers.length > 0;
  const hasMetaDrivers = metaData?.contributions && metaData.contributions.length > 0;

  // Format feature names nicely
  const formatFeatureName = (name: string) => {
    return name
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <div className="rounded-xl border border-orange-900/30 bg-gradient-to-b from-black/80 to-orange-950/10 p-6 space-y-6 shadow-glow relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <BarChart3 className="w-16 h-16 text-orange-500" />
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-orange-600/30 border border-orange-500/30">
          <BarChart3 className="w-5 h-5 text-orange-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-white tracking-widest">SHAP EXPLAINABILITY ENGINE</p>
          <p className="text-xs text-orange-500/80 font-semibold tracking-wider uppercase">
            Game-Theoretic Local Model Interpretability (XAI)
          </p>
        </div>
      </div>

      <p className="text-xs text-gray-400 leading-relaxed max-w-2xl bg-black/40 p-3 rounded-lg border border-white/5 font-mono">
        SHAP values quantify the additive contribution of each specific word and metadata feature to the final prediction score. Positive values drive the prediction towards <strong>FRAUD</strong>, while negative values pull it towards <strong>LEGITIMATE</strong>.
      </p>

      {/* Grid of Explanations */}
      <div className="grid md:grid-cols-2 gap-6">
        
        {/* TEXT MODEL SHAP */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-orange-400" /> TF-IDF + Logistic Regression Driver Words
          </h4>

          {hasTextDrivers ? (
            <div className="space-y-4 bg-black/30 p-4 rounded-xl border border-white/5">
              {/* Fraud Drivers */}
              {textData?.fraud_drivers && textData.fraud_drivers.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold tracking-widest text-red-400 uppercase">
                    🔴 TOP FRAUD INDICATORS (SHAP {">"} 0)
                  </span>
                  <div className="space-y-2">
                    {textData.fraud_drivers.slice(0, 5).map((d, i) => {
                      const pct = Math.min(100, Math.round(d.shap_value * 120));
                      return (
                        <div key={i} className="text-xs space-y-1">
                          <div className="flex justify-between font-mono">
                            <span className="text-gray-300 font-bold">"{d.word}"</span>
                            <span className="text-red-400">+{d.shap_value.toFixed(3)}</span>
                          </div>
                          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-red-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Legit Drivers */}
              {textData?.legit_drivers && textData.legit_drivers.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <span className="text-[10px] font-bold tracking-widest text-green-400 uppercase">
                    🟢 TOP LEGITIMATE INDICATORS (SHAP {"<"} 0)
                  </span>
                  <div className="space-y-2">
                    {textData.legit_drivers.slice(0, 5).map((d, i) => {
                      const pct = Math.min(100, Math.round(Math.abs(d.shap_value) * 120));
                      return (
                        <div key={i} className="text-xs space-y-1">
                          <div className="flex justify-between font-mono">
                            <span className="text-gray-300 font-bold">"{d.word}"</span>
                            <span className="text-green-400">{d.shap_value.toFixed(3)}</span>
                          </div>
                          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-black/20 border border-white/5 text-center py-8">
              <HelpCircle className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-xs text-gray-500 font-mono">No text driver analysis available for this case.</p>
            </div>
          )}
        </div>

        {/* METADATA MODEL SHAP */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <AlertOctagon className="w-3.5 h-3.5 text-orange-400" /> Random Forest Metadata SHAP Values
          </h4>

          {hasMetaDrivers ? (
            <div className="space-y-3 bg-black/30 p-4 rounded-xl border border-white/5">
              <span className="text-[10px] font-bold tracking-widest text-orange-400 uppercase">
                ⚙️ STRUCTURAL ATTRIBUTE IMPACT
              </span>

              <div className="space-y-2.5 pt-1">
                {metaData?.contributions?.map((c, i) => {
                  const isPositive = c.shap_value >= 0;
                  const pct = Math.min(100, Math.round(Math.abs(c.shap_value) * 180));
                  return (
                    <div key={i} className="text-xs space-y-1">
                      <div className="flex justify-between font-mono">
                        <span className="text-gray-400 font-medium">
                          {formatFeatureName(c.feature)}
                          <span className="text-[10px] text-gray-600 ml-1.5">({c.value})</span>
                        </span>
                        <span className={isPositive ? "text-red-400" : "text-green-400"}>
                          {isPositive ? "+" : ""}{c.shap_value.toFixed(3)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden flex">
                        {isPositive ? (
                          <div className="h-full bg-red-500" style={{ width: `${pct}%` }} />
                        ) : (
                          <div className="h-full bg-green-500" style={{ width: `${pct}%` }} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-black/20 border border-white/5 text-center py-8">
              <HelpCircle className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-xs text-gray-500 font-mono">No metadata analysis available.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default SHAPExplanationPanel;
