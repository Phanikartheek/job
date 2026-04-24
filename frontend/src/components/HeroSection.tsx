import { Link } from "react-router-dom";
import { Shield, AlertTriangle, Zap, FileSearch } from "lucide-react";
import { Button } from "@/components/ui/button";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden bg-hero-gradient">

      {/* Background layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-black to-red-950/30" />

      {/* Orange radial glows */}
      <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full bg-orange-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-red-700/10 blur-[100px] pointer-events-none" />

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-grid-pattern opacity-60 pointer-events-none" />

      {/* Scanline sweep */}
      <div className="scanline-overlay" />

      <div className="container relative z-10 mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">

          {/* BADGE */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-950/60 border border-orange-700/40 mb-8 tracking-widest animate-fade-in">
            <AlertTriangle className="w-4 h-4 text-orange-500 animate-alert-pulse" />
            <span className="text-sm text-orange-400 font-semibold tracking-widest">
              AI-POWERED RECRUITMENT FRAUD INTELLIGENCE PLATFORM
            </span>
          </div>

          {/* MAIN HEADING */}
          <h1 className="text-6xl md:text-8xl font-extrabold leading-tight mb-6 animate-fade-in">
            <span className="text-white">AI-POWERED</span>{" "}
            <span className="text-gradient-fire">FRAUD</span>
            <br />
            <span className="text-white">DETECTION</span>
          </h1>

          {/* SUBTITLE */}
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10 font-medium leading-relaxed animate-fade-in">
            A 5-model AI pipeline — TF-IDF Text Analyzer, Isolation Forest, Metadata Neural Network,
            Content Fusion, and XGBoost Ensemble — to detect fraudulent job postings with precision.
            Upload individual jobs or entire CSV/Excel files for bulk analysis.
          </p>

          {/* CTA BUTTONS */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link to="/login">
              <Button
                size="xl"
                className="relative bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white shadow-neon px-10 py-6 text-lg tracking-widest font-bold border-0 transition-all duration-300 hover:scale-105"
              >
                <Shield className="w-5 h-5 mr-2" />
                ANALYZE A JOB
              </Button>
            </Link>

            <a href="#how-it-works">
              <Button
                variant="outline"
                size="xl"
                className="border-orange-700/60 text-orange-400 hover:bg-orange-950/40 hover:border-orange-500 px-10 py-6 text-lg tracking-widest transition-all duration-300 hover:scale-105"
              >
                HOW IT WORKS
              </Button>
            </a>
          </div>

          {/* STATS PANEL */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { value: "5", label: "AI MODELS", icon: Zap, color: "text-orange-500" },
              { value: "95%+", label: "DETECTION RATE", icon: Shield, color: "text-white" },
              { value: "17K+", label: "JOBS ANALYZED", icon: FileSearch, color: "text-orange-400" },
              { value: "CSV", label: "BULK UPLOAD", icon: AlertTriangle, color: "text-red-400" },
            ].map(({ value, label, icon: Icon, color }) => (
              <div
                key={label}
                className="group bg-card-gradient border border-orange-900/30 hover:border-orange-600/50 p-6 rounded-xl shadow-card hover:shadow-neon transition-all duration-300 hover:scale-105"
              >
                <div className={`text-3xl md:text-4xl font-bold mb-2 ${color}`}>
                  {value}
                </div>
                <div className="flex items-center justify-center gap-1.5">
                  <Icon className={`w-3 h-3 ${color} opacity-70`} />
                  <span className="text-xs text-gray-500 tracking-wider">{label}</span>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
};

export default HeroSection;
