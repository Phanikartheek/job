import { useState } from "react";
import { Search, Loader2, Sparkles, FileUp, PenLine } from "lucide-react";
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
        factors: analysisResult.factors,
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
      const { data, error } = await supabase.functions.invoke("analyze-job", {
        body: {
          type: "manual",
          jobData: formData,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      // Call real Python ML models via Flask backend (falls back to TS if offline)
      const mlScores = await analyzeJobViaFlask(formData);

      const enrichedResult = {
        ...data,
        textScore: mlScores.textScore,
        metadataScore: mlScores.metadataScore,
        anomalyScore: mlScores.anomalyScore,
        llmExplanation: mlScores.llmExplanation,
      };

      setResult(enrichedResult);
      await saveToHistory(data, formData);
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
      const isImage = selectedFile.file.type.startsWith("image/");

      let content = selectedFile.base64;

      // For non-image files, we'll extract text content
      if (!isImage) {
        // For now, we'll send the base64 and let AI handle it
        // In production, you'd want to use a document parsing service
        content = selectedFile.base64;
      }

      const { data, error } = await supabase.functions.invoke("analyze-job", {
        body: {
          type: "file",
          content,
          fileType: isImage ? "image" : "document",
          fileName: selectedFile.file.name,
          mimeType: selectedFile.file.type,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setResult(data);

      // Save to history
      await saveToHistory(data, {});

      // If extracted data exists, populate the form
      if (data.extractedData) {
        setFormData({
          title: data.extractedData.title || "",
          company: data.extractedData.company || "",
          location: data.extractedData.location || "",
          salary: data.extractedData.salary || "",
          description: data.extractedData.description || "",
          requirements: "",
        });
      }

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
          <p className="text-muted-foreground">Upload a file or enter details manually for AI-powered fraud detection</p>
        </div>
      </div>

      {/* Tabs for Manual / Upload */}
      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <FileUp className="w-4 h-4" />
            Upload File
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <PenLine className="w-4 h-4" />
            Manual Entry
          </TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-6">
          <div className="p-6 md:p-8 rounded-2xl bg-card-gradient border border-border shadow-card">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Upload Job Posting</h3>
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
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Analyzing with AI...
                      </>
                    ) : (
                      <>
                        <Search className="w-5 h-5 mr-2" />
                        Analyze File
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Manual Tab */}
        <TabsContent value="manual">
          <form onSubmit={handleManualSubmit} className="space-y-6">
            <div className="p-6 md:p-8 rounded-2xl bg-card-gradient border border-border shadow-card">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Job Title *</Label>
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
                  <Label htmlFor="company">Company Name *</Label>
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
                <Label htmlFor="description">Job Description *</Label>
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
                      Analyzing with AI...
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
        </TabsContent>
      </Tabs>

      {/* Result */}
      {result && <AnalysisResult result={result} />}
    </div>
  );
};

export default Analyze;
