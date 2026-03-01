import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import AnalysisResult from "./AnalysisResult";

interface JobData {
  title: string;
  company: string;
  location: string;
  salary: string;
  description: string;
  requirements: string;
}

const AnalysisForm = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<{ isFake: boolean; confidence: number; factors: string[] } | null>(null);
  const [formData, setFormData] = useState<JobData>({
    title: "",
    company: "",
    location: "",
    salary: "",
    description: "",
    requirements: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const analyzeJob = async () => {
    setIsAnalyzing(true);
    setResult(null);

    // Simulate ML analysis with realistic timing
    await new Promise((resolve) => setTimeout(resolve, 2500));

    // Mock analysis based on content patterns
    const suspiciousPatterns = [
      formData.salary.toLowerCase().includes("guaranteed"),
      formData.description.toLowerCase().includes("no experience"),
      formData.description.toLowerCase().includes("work from home") && formData.salary.includes("$"),
      formData.company.length < 3,
      formData.requirements.toLowerCase().includes("pay"),
      formData.description.toLowerCase().includes("urgent"),
      !formData.location,
    ];

    const suspiciousCount = suspiciousPatterns.filter(Boolean).length;
    const isFake = suspiciousCount >= 2;
    const confidence = Math.min(95, 60 + suspiciousCount * 10 + Math.random() * 15);

    const factors: string[] = [];
    if (formData.salary.toLowerCase().includes("guaranteed")) factors.push("Unrealistic salary claims detected");
    if (formData.description.toLowerCase().includes("no experience")) factors.push("No experience requirement is unusual");
    if (formData.description.toLowerCase().includes("urgent")) factors.push("Urgency tactics detected");
    if (!formData.location) factors.push("Missing location information");
    if (formData.requirements.toLowerCase().includes("pay")) factors.push("Request for payment is a red flag");
    if (factors.length === 0) factors.push("No significant red flags detected");

    setResult({
      isFake,
      confidence: Math.round(confidence),
      factors,
    });

    setIsAnalyzing(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    analyzeJob();
  };

  return (
    <section id="analyze" className="relative py-24">
      <div className="absolute inset-0 bg-hero-gradient" />
      <div className="absolute inset-0 bg-grid-pattern opacity-20" />
      
      <div className="container relative z-10 mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Analyze Job Posting
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Paste the job posting details below for instant fraud analysis using our ML-powered detection system.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="p-8 rounded-2xl bg-card-gradient border border-border shadow-card">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Job Title</Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="e.g., Senior Software Engineer"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company Name</Label>
                  <Input
                    id="company"
                    name="company"
                    placeholder="e.g., Tech Corp Inc."
                    value={formData.company}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    name="location"
                    placeholder="e.g., New York, NY (Remote)"
                    value={formData.location}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salary">Salary Range</Label>
                  <Input
                    id="salary"
                    name="salary"
                    placeholder="e.g., $80,000 - $120,000"
                    value={formData.salary}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="space-y-2 mt-6">
                <Label htmlFor="description">Job Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Paste the full job description here..."
                  className="min-h-[160px]"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2 mt-6">
                <Label htmlFor="requirements">Requirements & Qualifications</Label>
                <Textarea
                  id="requirements"
                  name="requirements"
                  placeholder="Paste the requirements and qualifications..."
                  className="min-h-[120px]"
                  value={formData.requirements}
                  onChange={handleInputChange}
                />
              </div>

              <div className="mt-8 flex justify-center">
                <Button
                  type="submit"
                  variant="analyze"
                  disabled={isAnalyzing || !formData.title || !formData.company || !formData.description}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Analyzing with ML Models...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5 mr-2" />
                      Analyze Job Posting
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>

          {/* Result */}
          {result && <AnalysisResult result={result} />}
        </div>
      </div>
    </section>
  );
};

export default AnalysisForm;
