import { Brain, Zap, Database, BarChart3, Upload, FileDown, Network, TreePine } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "RoBERTa Text Model",
    description: "Transformer-based NLP model analyzes job description text for linguistic fraud patterns, suspicious phrases, and semantic inconsistencies.",
  },
  {
    icon: Network,
    title: "Metadata Neural Network",
    description: "Processes structured features such as salary ranges, location data, contact email domains, and company information to detect metadata fraud signals.",
  },
  {
    icon: TreePine,
    title: "Isolation Forest",
    description: "Unsupervised anomaly detection identifies unusual job postings that deviate from normal patterns, catching novel fraud not in training data.",
  },
  {
    icon: Zap,
    title: "LLM Explanation Engine",
    description: "Converts fraud scores and suspicious indicators into human-readable, actionable explanations so you understand exactly why a posting is flagged.",
  },
  {
    icon: Upload,
    title: "Bulk CSV / Excel Upload",
    description: "Upload entire datasets of job postings — CSV, Excel, or Text files — for batch analysis with per-row fraud risk scores and downloadable reports.",
  },
  {
    icon: FileDown,
    title: "Downloadable Reports",
    description: "Export comprehensive fraud analysis results as formatted PDF reports or CSV spreadsheets for record-keeping, HR audits, and external sharing.",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="relative py-24 bg-secondary/20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            4-Model AI Detection Architecture
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            The platform combines four AI components — RoBERTa, Metadata Neural Network,
            Isolation Forest, and an LLM Explanation Engine — with bulk file analysis and
            downloadable reports.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-6 rounded-2xl bg-card-gradient border border-border shadow-card hover:shadow-elevated transition-all duration-300 hover:-translate-y-1"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="p-3 rounded-xl bg-accent-gradient w-fit mb-4 group-hover:shadow-glow transition-shadow duration-300">
                <feature.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Architecture formula */}
        <div className="mt-16 p-6 rounded-2xl bg-black/60 border border-red-900/30 max-w-2xl mx-auto text-center">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Risk Score Formula</p>
          <p className="font-mono text-sm text-gray-300">
            <span className="text-red-400">Final Risk Score</span> ={" "}
            <span className="text-purple-400">(0.6 × RoBERTa)</span> +{" "}
            <span className="text-blue-400">(0.3 × Metadata NN)</span> +{" "}
            <span className="text-teal-400">(0.1 × Isolation Forest)</span>
          </p>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
