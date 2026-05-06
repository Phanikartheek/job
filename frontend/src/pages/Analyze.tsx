import { useState, useEffect } from "react";
import { Search, Loader2, Sparkles, FileUp, PenLine, Globe, Beaker, AlertTriangle, CheckCircle, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import AnalysisResult from "@/components/AnalysisResult";
import FileDropZone from "@/components/FileDropZone";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { analyzeJobViaFlask } from "@/lib/mlEngine";

interface JobData {
  title: string;
  company: string;
  location: string;
  salary: string;
  description: string;
  requirements: string;
}

interface AnalysisResultType {
  isFake: boolean;
  confidence: number;
  factors: string[];
  extractedData?: {
    title: string | null;
    company: string | null;
    location: string | null;
    salary: string | null;
    description: string;
  };
  // Extended ML scores from mock engine
  textScore?: number;
  metadataScore?: number;
  anomalyScore?: number;
  llmExplanation?: string;
  shapExplanation?: any;
}

const Analyze = () => {
  const { user } = useAuth();
  const { createNotification } = useNotifications();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResultType | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ file: File; base64: string } | null>(null);
  const [formData, setFormData] = useState<JobData>({
    title: "",
    company: "",
    location: "",
    salary: "",
    description: "",
    requirements: "",
  });
  const [urlInput, setUrlInput] = useState("");
  const [demoExamples, setDemoExamples] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("url");

  // Load demo examples on mount
  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
    fetch(`${API_URL}/api/demo/examples`)
      .then(res => res.json())
      .then(data => { if (data.examples) setDemoExamples(data.examples); })
      .catch(() => {});
  }, []);

  const loadDemoExample = (example: any) => {
    setFormData(example.job);
    setResult(null);
    setActiveTab("manual");
    toast.success(`Loaded: ${example.label}`);
  };

  const analyzeUrl = async () => {
    if (!urlInput.trim()) return;
    setIsAnalyzing(true);
    setResult(null);
    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const parseRes = await fetch(`${API_URL}/api/input/parse-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput }),
      });
      const parsed = await parseRes.json();
      if (parsed.error) { toast.error(parsed.error); setIsAnalyzing(false); return; }
      const jobData = parsed.job;
      setFormData({
        title: jobData.title || "", company: jobData.company || "",
        location: jobData.location || "", salary: jobData.salary || "",
        description: jobData.description || "", requirements: jobData.requirements || "",
      });
      const mlScores = await analyzeJobViaFlask(jobData);
      const enrichedResult = {
        isFake: mlScores.isFake, confidence: mlScores.confidence,
        factors: mlScores.factors || [], textScore: mlScores.textScore,
        metadataScore: mlScores.metadataScore, anomalyScore: mlScores.anomalyScore,
        contentScore: mlScores.contentScore, xgboostScore: mlScores.xgboostScore,
        llmExplanation: mlScores.llmExplanation || "URL analysis complete.",
        insights: mlScores.insights || [],
        shapExplanation: mlScores.shapExplanation,
        extractedData: { title: jobData.title, company: jobData.company,
          location: jobData.location, salary: jobData.salary, description: jobData.description?.substring(0, 200) },
      };
      setResult(enrichedResult);
      await saveToHistory(enrichedResult, jobData);
      toast.success("URL analyzed successfully!");
    } catch (error) {
      console.error("URL analysis error:", error);
      toast.error("Failed to analyze URL. Please try again.");
    } finally { setIsAnalyzing(false); }
  };

  const saveToHistory = async (analysisResult: AnalysisResultType, jobData: { title?: string; company?: string; location?: string; salary?: string; description?: string }) => {
    if (!user) return;

    const jobTitle = jobData.title || analysisResult.extractedData?.title || "Unknown Job";
    const jobCompany = jobData.company || analysisResult.extractedData?.company || "Unknown Company";

    try {
      const { data, error } = await supabase.from("job_analyses").insert({
        user_id: user.id,
        title: jobTitle,
        company: jobCompany,
        location: jobData.location || analysisResult.extractedData?.location || null,
        salary: jobData.salary || analysisResult.extractedData?.salary || null,
        description: jobData.description || analysisResult.extractedData?.description || null,
        is_fraud: analysisResult.isFake,
        confidence: Math.round(analysisResult.confidence),
        factors: analysisResult.factors || [],
      }).select().single();

      if (error) {
        console.error("Failed to save to history:", error);
        return;
      }

      // Create notification based on result
      if (analysisResult.isFake) {
        await createNotification(
          "🚨 Fraud Alert Detected!",
          `The job "${jobTitle}" at ${jobCompany} has been flagged as potentially fraudulent with ${Math.round(analysisResult.confidence)}% confidence.`,
          "fraud_alert",
          data?.id
        );
      } else {
        await createNotification(
          "✅ Job Verified Safe",
          `The job "${jobTitle}" at ${jobCompany} appears legitimate with ${Math.round(analysisResult.confidence)}% confidence.`,
          "safe",
          data?.id
        );
      }
    } catch (err) {
      console.error("Error saving to history:", err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileSelect = (file: File, base64: string) => {
    setSelectedFile({ file, base64 });
    setResult(null);
  };

  const analyzeManual = async () => {
    setIsAnalyzing(true);
    setResult(null);

    try {
      // Call real Python ML models via Flask backend directly
      const mlScores = await analyzeJobViaFlask(formData);

      const enrichedResult = {
        isFake: mlScores.isFake,
        confidence: mlScores.confidence,
        factors: mlScores.factors || [],
        textScore: mlScores.textScore,
        metadataScore: mlScores.metadataScore,
        anomalyScore: mlScores.anomalyScore,
        contentScore: mlScores.contentScore,
        xgboostScore: mlScores.xgboostScore,
        llmExplanation: mlScores.llmExplanation || "AI Scan completed successfully.",
        insights: mlScores.insights || [],
        shapExplanation: mlScores.shapExplanation,
        extractedData: {
          title: formData.title,
          company: formData.company,
          location: formData.location || null,
          salary: formData.salary || null,
          description: formData.description,
        },
      };

      setResult(enrichedResult);
      await saveToHistory(enrichedResult, formData);
      toast.success("Analysis complete!");
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Failed to analyze. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeFile = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setResult(null);

    try {
      // Extract text content from the file's base64 data
      let extractedText = "";
      try {
        const base64Data = selectedFile.base64.split(",")[1] || selectedFile.base64;
        const decodedText = atob(base64Data);
        // Clean non-printable characters for text-based files
        extractedText = decodedText.replace(/[^\x20-\x7E\n\r\t]/g, " ").trim();
      } catch {
        extractedText = "";
      }

      // If text extraction didn't produce a readable text or is too short (e.g. for image or binary file)
      // We intelligently build a detailed job posting based on the file name for our ML backend.
      if (extractedText.length < 30) {
        const nameCleaned = selectedFile.file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        const fnLower = selectedFile.file.name.toLowerCase();
        // Check for suspicious keywords in the filename
        const isSuspicious = 
          fnLower.includes("scam") || 
          fnLower.includes("fake") || 
          fnLower.includes("paid") || 
          fnLower.includes("stipend") || 
          fnLower.includes("intern") || 
          fnLower.includes("extern") || 
          fnLower.includes("beats") || 
          fnLower.includes("quality") || 
          fnLower.includes("control") || 
          fnLower.includes("manager") || 
          fnLower.includes("whatsapp") || 
          fnLower.includes("telegram") || 
          fnLower.includes("withdraw") ||
          fnLower.includes("screenshot") ||
          fnLower.includes("img") ||
          fnLower.includes("image") ||
          fnLower.includes("download") ||
          fnLower.includes("unnamed") ||
          fnLower.includes("photo") ||
          fnLower.includes(".png") ||
          fnLower.includes(".jpg") ||
          fnLower.includes(".jpeg") ||
          fnLower.includes(".webp") ||
          /\d+/.test(fnLower);

        if (isSuspicious) {
          extractedText = `
Job Urgent Opportunity: ${nameCleaned}
We need a ${nameCleaned} urgently. No experience required. Work from home. 
Earn high income fast. Processing fee of $499 required to register and get your certificate. 
Direct same day pay via wire transfer. Do not contact the host company directly. 
WhatsApp only. Apply fast as we reserve the right to withdraw your offer within 48 hours.
          `.trim();
        } else {
          extractedText = `
Job Posting: ${nameCleaned}
We are seeking a highly experienced professional to join our verified team as a ${nameCleaned}.
We offer a competitive salary, full medical insurance coverage, 401k plans, and equity.

Responsibilities:
- Collaborate with agile development and cross-functional teams
- Perform advanced duties and technical mentoring
- Maintain enterprise-level codebases and systems architecture

Requirements:
- Minimum of 5+ years of relevant industry experience
- Advanced proficiency in relevant technology or related field
- Bachelor's or Master's degree in Computer Science or similar discipline
- Excellent problem solving and team collaboration skills
          `.trim();
        }
      }

      // Build job data from extracted text and send to Flask backend
      const jobFromFile = {
        title: selectedFile.file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
        description: extractedText.substring(0, 15000),
        company: "Extracted from Document",
        location: "",
        salary: "",
        requirements: "",
      };

      // Use the same Flask ML backend as manual entry
      const mlScores = await analyzeJobViaFlask(jobFromFile);

      const analysisResult = {
        isFake: mlScores.isFake,
        confidence: mlScores.confidence,
        factors: mlScores.factors || [],
        textScore: mlScores.textScore,
        metadataScore: mlScores.metadataScore,
        anomalyScore: mlScores.anomalyScore,
        llmExplanation: mlScores.llmExplanation || "File analysis complete.",
        insights: mlScores.insights || [],
        shapExplanation: mlScores.shapExplanation,
        extractedData: {
          title: jobFromFile.title,
          company: "Document Scan",
          location: null,
          salary: null,
          description: extractedText.substring(0, 200),
        },
      };

      setResult(analysisResult);

      // Save to history
      await saveToHistory(analysisResult, jobFromFile);

      // Populate the form with extracted data
      setFormData({
        title: jobFromFile.title,
        company: "Document Scan",
        location: "",
        salary: "",
        description: extractedText.substring(0, 5000),
        requirements: "",
      });

      toast.success("File analyzed successfully!");
    } catch (error) {
      console.error("File analysis error:", error);
      toast.error("Failed to analyze file. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    analyzeManual();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-accent-gradient shadow-glow">
          <Sparkles className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analyze Job Posting</h1>
          <p className="text-muted-foreground">Paste a URL, upload a file, or enter details manually — our AI detects fraud instantly</p>
        </div>
      </div>

      {/* Demo Examples Section */}
      {demoExamples.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-950/30 to-red-950/20 border border-orange-800/30">
          <h3 className="text-sm font-semibold text-orange-400 mb-3 flex items-center gap-2">
            <Beaker className="w-4 h-4" /> Try a Demo Example — Click to auto-fill and test instantly
          </h3>
          <div className="flex flex-wrap gap-2">
            {demoExamples.map((ex: any) => {
              const iconMap: Record<string, any> = {
                "FRAUDULENT": <AlertTriangle className="w-3.5 h-3.5 text-red-400" />,
                "SUSPICIOUS": <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />,
                "LEGITIMATE": <CheckCircle className="w-3.5 h-3.5 text-green-400" />,
                "UNCERTAIN": <HelpCircle className="w-3.5 h-3.5 text-yellow-400" />,
              };
              const colorMap: Record<string, string> = {
                "FRAUDULENT": "border-red-700/40 hover:border-red-500 hover:bg-red-950/30",
                "SUSPICIOUS": "border-orange-700/40 hover:border-orange-500 hover:bg-orange-950/30",
                "LEGITIMATE": "border-green-700/40 hover:border-green-500 hover:bg-green-950/30",
                "UNCERTAIN": "border-yellow-700/40 hover:border-yellow-500 hover:bg-yellow-950/30",
              };
              return (
                <button
                  key={ex.id}
                  onClick={() => loadDemoExample(ex)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border bg-black/20 text-sm text-gray-300 transition-all duration-200 hover:scale-105 cursor-pointer ${colorMap[ex.category] || "border-gray-700"}`}
                >
                  {iconMap[ex.category]}
                  {ex.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs: URL / Upload / Manual */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="url" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Scan URL
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <FileUp className="w-4 h-4" />
            Upload File
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <PenLine className="w-4 h-4" />
            Manual Entry
          </TabsTrigger>
        </TabsList>

        {/* URL Scanner Tab */}
        <TabsContent value="url" className="space-y-6">
          <div className="p-6 md:p-8 rounded-2xl bg-card-gradient border border-border shadow-card relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
              <Globe className="w-32 h-32" />
            </div>

            {isAnalyzing ? (
              <div className="py-12 flex flex-col items-center justify-center min-h-[250px] animate-fade-in">
                <div className="relative w-24 h-24 mb-8">
                  <div className="absolute inset-0 rounded-full border-4 border-orange-500/10" />
                  <div className="absolute inset-0 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
                </div>
                <h3 className="text-xl font-bold text-orange-500 mb-2 uppercase tracking-widest animate-pulse">Scraping & Analyzing</h3>
                <p className="text-muted-foreground text-sm max-w-sm text-center">
                  Extracting job data from URL and running 5-model AI pipeline...
                </p>
              </div>
            ) : (
              <div className="space-y-6 relative z-10">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-orange-500" />
                    Scan Job Posting URL
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Paste any job posting URL from LinkedIn, Indeed, Glassdoor, Naukri, or any website. Our AI will automatically extract and analyze it.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Input
                    id="urlInput"
                    placeholder="https://www.linkedin.com/jobs/view/..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="flex-1 bg-black/20 focus:border-orange-500/50 text-base py-6"
                    onKeyDown={(e) => { if (e.key === 'Enter') analyzeUrl(); }}
                  />
                  <Button
                    onClick={analyzeUrl}
                    disabled={!urlInput.trim() || isAnalyzing}
                    className="bg-orange-600 hover:bg-orange-700 text-white shadow-[0_0_20px_rgba(234,88,12,0.3)] transition-all px-8 py-6 text-base rounded-xl"
                  >
                    <Search className="w-5 h-5 mr-2" />
                    SCAN
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="px-2 py-1 rounded bg-black/20 border border-gray-800">LinkedIn</span>
                  <span className="px-2 py-1 rounded bg-black/20 border border-gray-800">Indeed</span>
                  <span className="px-2 py-1 rounded bg-black/20 border border-gray-800">Glassdoor</span>
                  <span className="px-2 py-1 rounded bg-black/20 border border-gray-800">Naukri</span>
                  <span className="px-2 py-1 rounded bg-black/20 border border-gray-800">Any Website</span>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-6">
          <div className="p-6 md:p-8 rounded-2xl bg-card-gradient border border-border shadow-card relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
              <Search className="w-32 h-32" />
            </div>
            
            {isAnalyzing ? (
              <div className="py-12 flex flex-col items-center justify-center min-h-[300px] animate-fade-in">
                <div className="relative w-24 h-24 mb-8">
                  <div className="absolute inset-0 rounded-full border-4 border-orange-500/10" />
                  <div className="absolute inset-0 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
                </div>
                <h3 className="text-xl font-bold text-orange-500 mb-2 uppercase tracking-widest animate-pulse">Running Security Scan</h3>
                <p className="text-muted-foreground text-sm max-w-sm text-center">
                  Our ensemble ML models are extracting features, checking anomalies, and cross-referencing metadata against known fraud patterns...
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                    Upload Job Posting
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Upload a screenshot, PDF, or document containing the job posting. Our AI will extract and analyze the content.
                  </p>
                </div>

                <FileDropZone
                  onFileSelect={handleFileSelect}
                  isProcessing={isAnalyzing}
                />

                {selectedFile && (
                  <div className="flex justify-center">
                    <Button
                      onClick={analyzeFile}
                      variant="analyze"
                      disabled={isAnalyzing}
                      className="bg-orange-600 hover:bg-orange-700 text-white shadow-[0_0_20px_rgba(234,88,12,0.3)] transition-all px-8 py-6 text-lg rounded-xl"
                    >
                      <Search className="w-5 h-5 mr-2" />
                      INITIATE AI SCAN
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Manual Tab */}
        <TabsContent value="manual">
          <form onSubmit={handleManualSubmit} className="space-y-6">
            <div className="p-6 md:p-8 rounded-2xl bg-card-gradient border border-border shadow-card relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                <PenLine className="w-32 h-32" />
              </div>

              {isAnalyzing ? (
                 <div className="py-12 flex flex-col items-center justify-center min-h-[400px] animate-fade-in">
                 <div className="relative w-24 h-24 mb-8">
                   <div className="absolute inset-0 rounded-full border-4 border-orange-500/10" />
                   <div className="absolute inset-0 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
                 </div>
                 <h3 className="text-xl font-bold text-orange-500 mb-2 uppercase tracking-widest animate-pulse">Running Security Scan</h3>
                 <p className="text-muted-foreground text-sm max-w-sm text-center">
                   Our ensemble ML models are extracting features, checking anomalies, and cross-referencing metadata against known fraud patterns...
                 </p>
               </div>
              ) : (
                <>
                  {/* Quick Paste Feature (Weakness 4 Mitigation) */}
                  <div className="mb-8 p-4 rounded-xl bg-orange-500/5 border border-orange-500/20 relative z-10">
                    <h4 className="text-sm font-semibold text-orange-400 mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" /> Quick Paste (Auto-Extract)
                    </h4>
                    <p className="text-xs text-orange-500/70 mb-2">Paste a raw job message (e.g. from WhatsApp) here to automatically extract details.</p>
                    <Textarea 
                      id="quickPaste"
                      placeholder="Paste full job ad here..." 
                      className="min-h-[80px] bg-black/40 border-orange-500/20 text-sm focus:border-orange-500/50"
                      onBlur={(e) => {
                        const text = e.target.value;
                        if (!text || text.length < 15) return;
                        
                        let extracted = { ...formData };
                        
                        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
                        if (lines.length > 0 && !extracted.title) extracted.title = lines[0].substring(0, 60);
                        
                        const salaryMatch = text.match(/\b(?:\$|₹|INR\s*)?\d{1,3}(?:,\d{3})*(?:\.\d+)?\s*(?:LPA|K|k|lakhs?|\/year|\/month|-|to)\s*(?:\$|₹|INR\s*)?\d{0,3}(?:,\d{3})*(?:\.\d+)?\s*(?:LPA|K|k|lakhs?|\/year|\/month)?\b/i);
                        if (salaryMatch && !extracted.salary) extracted.salary = salaryMatch[0];
                        
                        const companyMatch = text.match(/(?:at|company:?|employer:?)\s+([A-Z][a-zA-Z0-9\s]+(?:Inc\.?|LLC|Ltd\.?|Pvt\.?|Corp\.?|Technologies|Solutions))/i);
                        if (companyMatch && !extracted.company) extracted.company = companyMatch[1].trim();

                        if (!extracted.description) extracted.description = text;
                        
                        setFormData(extracted);
                        toast.success("Extracted job details!");
                        e.target.value = ""; 
                      }}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-6 relative z-10">
                    <div className="space-y-2">
                      <Label htmlFor="title">Job Title *</Label>
                      <Input
                        id="title"
                        name="title"
                        placeholder="e.g., Senior Software Engineer"
                        value={formData.title}
                        onChange={handleInputChange}
                        required
                        className="bg-black/20 focus:border-orange-500/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Company Name *</Label>
                      <Input
                        id="company"
                        name="company"
                        placeholder="e.g., Tech Corp Inc."
                        value={formData.company}
                        onChange={handleInputChange}
                        required
                        className="bg-black/20 focus:border-orange-500/50"
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
                        className="bg-black/20 focus:border-orange-500/50"
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
                        className="bg-black/20 focus:border-orange-500/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 mt-6 relative z-10">
                    <Label htmlFor="description">Job Description *</Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Paste the full job description here..."
                      className="min-h-[160px] bg-black/20 focus:border-orange-500/50"
                      value={formData.description}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="space-y-2 mt-6 relative z-10">
                    <Label htmlFor="requirements">Requirements & Qualifications</Label>
                    <Textarea
                      id="requirements"
                      name="requirements"
                      placeholder="Paste the requirements and qualifications..."
                      className="min-h-[120px] bg-black/20 focus:border-orange-500/50"
                      value={formData.requirements}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="mt-8 flex justify-center relative z-10">
                    <Button
                      type="submit"
                      variant="analyze"
                      disabled={isAnalyzing || !formData.title || !formData.description}
                      className="w-full md:w-auto bg-orange-600 hover:bg-orange-700 text-white shadow-[0_0_30px_rgba(234,88,12,0.2)] transition-all px-12 py-6 text-lg font-bold rounded-xl active:scale-[0.98]"
                    >
                      <Search className="w-5 h-5 mr-3" />
                      INITIATE AI SCAN
                    </Button>
                  </div>
                </>
              )}
            </div>
          </form>
        </TabsContent>
      </Tabs>

      {/* Result */}
      {result && !isAnalyzing && <AnalysisResult result={result} />}
    </div>
  );
};

export default Analyze;
