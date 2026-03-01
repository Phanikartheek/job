import { Link } from "react-router-dom";
import { Shield, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden bg-hero-gradient">

      {/* Subtle red glow background */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-black to-red-950 opacity-60" />
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-800/10 rounded-full blur-3xl" />

      <div className="container relative z-10 mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">

          {/* SECURITY BADGE */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-900/40 border border-red-700/40 mb-8 tracking-widest">
            <AlertTriangle className="w-4 h-4 text-red-500 animate-alert-pulse" />
            <span className="text-sm text-red-400 font-semibold">
              AI-POWERED RECRUITMENT FRAUD INTELLIGENCE PLATFORM
            </span>
          </div>

          {/* MAIN HEADING */}
          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-6 tracking-wider">
            <span className="text-white">AI-POWERED</span>{" "}
            <span className="text-gradient">RECRUITMENT</span>
            <br />
            <span className="text-white">FRAUD INTELLIGENCE</span>
          </h1>

          {/* SUBTITLE */}
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            A 4-model AI pipeline combining RoBERTa, Metadata Neural Network, Isolation Forest,
            and LLM Explanation Engine to detect and explain fraudulent job postings with precision.
            Upload individual jobs or entire CSV/Excel files for bulk analysis.
          </p>

          {/* CTA BUTTONS */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link to="/login">
              <Button
                size="xl"
                className="bg-red-600 hover:bg-red-700 text-white shadow-danger px-8 py-6 text-lg tracking-widest"
              >
                <Shield className="w-5 h-5 mr-2" />
                ANALYZE A JOB
              </Button>
            </Link>

            <a href="#how-it-works">
              <Button
                variant="outline"
                size="xl"
                className="border-red-700 text-red-500 hover:bg-red-900/30 px-8 py-6 text-lg tracking-widest"
              >
                HOW IT WORKS
              </Button>
            </a>
          </div>

          {/* HARD STATS PANEL */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
            <div className="bg-card-gradient border border-red-900/30 p-6 rounded-xl shadow-card">
              <div className="text-3xl md:text-4xl font-bold text-red-500 mb-1">
                4
              </div>
              <div className="text-sm text-gray-500 tracking-wider">
                AI MODELS
              </div>
            </div>

            <div className="bg-card-gradient border border-red-900/30 p-6 rounded-xl shadow-card">
              <div className="text-3xl md:text-4xl font-bold text-white mb-1">
                95%+
              </div>
              <div className="text-sm text-gray-500 tracking-wider">
                DETECTION RATE
              </div>
            </div>

            <div className="bg-card-gradient border border-red-900/30 p-6 rounded-xl shadow-card">
              <div className="text-3xl md:text-4xl font-bold text-white mb-1">
                17K+
              </div>
              <div className="text-sm text-gray-500 tracking-wider">
                JOBS ANALYZED
              </div>
            </div>

            <div className="bg-card-gradient border border-red-900/30 p-6 rounded-xl shadow-card">
              <div className="text-3xl md:text-4xl font-bold text-red-400 mb-1">
                CSV
              </div>
              <div className="text-sm text-gray-500 tracking-wider">
                BULK UPLOAD
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
