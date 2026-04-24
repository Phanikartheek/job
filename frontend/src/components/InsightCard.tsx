import { motion } from "framer-motion";
import { AlertCircle, ShieldCheck, Fingerprint, Search } from "lucide-react";

interface Insight {
  type: string;
  msg: string;
}

interface InsightCardProps {
  insights: Insight[];
}

export const InsightCard = ({ insights }: InsightCardProps) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'content': return <Search className="w-5 h-5 text-blue-400" />;
      case 'anomaly': return <Fingerprint className="w-5 h-5 text-purple-400" />;
      case 'metadata': return <ShieldCheck className="w-5 h-5 text-green-400" />;
      default: return <AlertCircle className="w-5 h-5 text-orange-400" />;
    }
  };

  return (
    <div className="space-y-3 mt-6">
      <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">AI Reasoning Engine</h3>
      <div className="grid gap-3">
        {insights.length > 0 ? (
          insights.map((insight, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <div className="mt-1">{getIcon(insight.type)}</div>
              <p className="text-sm text-white/90 leading-relaxed">{insight.msg}</p>
            </motion.div>
          ))
        ) : (
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
            No critical fraud patterns detected in this job listing.
          </div>
        )}
      </div>
    </div>
  );
};
