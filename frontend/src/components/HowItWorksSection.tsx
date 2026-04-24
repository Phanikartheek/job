import { FileUp, Cpu, BarChart, Bot } from "lucide-react";

const steps = [
  {
    icon: FileUp,
    step: "01",
    title: "Upload File",
    description: "Upload a CSV, Excel, or Text file containing job postings. Or paste a single job manually for instant analysis.",
  },
  {
    icon: Cpu,
    step: "02",
    title: "Parse & Extract",
    description: "Backend validates format and uses Pandas/parsing logic to extract structured fields — title, salary, location, description.",
  },
  {
    icon: BarChart,
    step: "03",
    title: "4-Model AI Pipeline",
    description: "Each posting passes through TF-IDF (text), Metadata Neural Network, and Isolation Forest. Scores are combined using weighted formula.",
  },
  {
    icon: Bot,
    step: "04",
    title: "Risk Score + LLM Explanation",
    description: "A composite Fraud Risk Score (0–100) is generated alongside a human-readable LLM explanation and downloadable report.",
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="relative py-24">
      <div className="absolute inset-0 bg-hero-gradient" />
      <div className="absolute inset-0 bg-grid-pattern opacity-20" />

      <div className="container relative z-10 mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A 7-step pipeline from file upload to downloadable fraud intelligence report.
            Multi-model scoring with LLM-powered human-readable explanations.
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((item, index) => (
              <div key={index} className="relative">
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-primary/50 to-transparent z-0" />
                )}

                <div className="relative z-10 text-center">
                  {/* Step number */}
                  <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-card-gradient border border-border shadow-card mb-6 group hover:shadow-glow transition-shadow duration-300">
                    <div className="relative">
                      <item.icon className="w-10 h-10 text-primary" />
                      <span className="absolute -top-2 -right-2 text-xs font-bold text-muted-foreground">
                        {item.step}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Technical details */}
        <div className="mt-20 p-8 rounded-2xl bg-card-gradient border border-border shadow-card max-w-4xl mx-auto">
          <h3 className="text-xl font-semibold text-foreground mb-4 text-center">
            AI Technology Stack
          </h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            {["TF-IDF (Text Model)", "Metadata Neural Network", "Isolation Forest", "LLM Explanation Engine"].map((tech, index) => (
              <div
                key={index}
                className="px-4 py-3 rounded-lg bg-secondary/50 border border-border text-center"
              >
                <span className="text-sm font-medium text-foreground">{tech}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
