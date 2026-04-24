import { useState, useEffect } from "react";
import { History, Search, Filter, CheckCircle2, AlertTriangle, Trash2, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ---- Risk badge helper ----
function getRiskInfo(confidence: number, isFraud: boolean): { label: string; color: string; bg: string; bar: string } {
  if (!isFraud || confidence < 25) return { label: "LOW", color: "#22c55e", bg: "bg-green-900/20", bar: "bg-green-500" };
  if (confidence < 50) return { label: "MEDIUM", color: "#eab308", bg: "bg-yellow-900/20", bar: "bg-yellow-400" };
  if (confidence < 75) return { label: "HIGH", color: "#f97316", bg: "bg-orange-900/20", bar: "bg-orange-500" };
  return { label: "CRITICAL", color: "#ef4444", bg: "bg-red-900/20", bar: "bg-red-500" };
}

interface AnalysisRecord {
  id: string;
  title: string | null;
  company: string | null;
  location: string | null;
  salary: string | null;
  description: string | null;
  is_fraud: boolean;
  confidence: number;
  factors: string[];
  created_at: string;
}

const HistoryPage = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "safe" | "fraud">("all");
  const [historyData, setHistoryData] = useState<AnalysisRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<AnalysisRecord | null>(null);

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("job_analyses")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setHistoryData(data || []);
    } catch (error) {
      console.error("Failed to fetch history:", error);
      toast.error("Failed to load history");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteRecord = async (id: string) => {
    try {
      const { error } = await supabase
        .from("job_analyses")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setHistoryData(prev => prev.filter(item => item.id !== id));
      toast.success("Record deleted");
    } catch (error) {
      console.error("Failed to delete record:", error);
      toast.error("Failed to delete record");
    }
  };

  const filteredHistory = historyData.filter((item) => {
    const matchesSearch =
      (item.title?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      (item.company?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
    const matchesFilter = filter === "all" ||
      (filter === "fraud" && item.is_fraud) ||
      (filter === "safe" && !item.is_fraud);
    return matchesSearch && matchesFilter;
  });

  const safeCount = historyData.filter(h => !h.is_fraud).length;
  const fraudCount = historyData.filter(h => h.is_fraud).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-accent-gradient shadow-glow">
            <History className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Analysis History</h1>
            <p className="text-muted-foreground">View all your previous job analyses</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="px-3 py-1 rounded-full bg-secondary">{historyData.length} total</span>
          <span className="px-3 py-1 rounded-full bg-success/10 text-success">
            {safeCount} safe
          </span>
          <span className="px-3 py-1 rounded-full bg-destructive/10 text-destructive">
            {fraudCount} fraud
          </span>
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search by job title or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            <Filter className="w-4 h-4 mr-1" />
            All
          </Button>
          <Button
            variant={filter === "safe" ? "safe" : "outline"}
            size="sm"
            onClick={() => setFilter("safe")}
          >
            <CheckCircle2 className="w-4 h-4 mr-1" />
            Safe
          </Button>
          <Button
            variant={filter === "fraud" ? "danger" : "outline"}
            size="sm"
            onClick={() => setFilter("fraud")}
          >
            <AlertTriangle className="w-4 h-4 mr-1" />
            Fraud
          </Button>
        </div>
      </div>

      {/* History list */}
      <div className="rounded-xl bg-card-gradient border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary/50">
              <tr>
                <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Job Title</th>
                <th className="text-left p-4 text-sm font-semibold text-muted-foreground hidden md:table-cell">Company</th>
                <th className="text-left p-4 text-sm font-semibold text-muted-foreground hidden lg:table-cell">Location</th>
                <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Status</th>
                <th className="text-left p-4 text-sm font-semibold text-muted-foreground hidden sm:table-cell">Date</th>
                <th className="text-right p-4 text-sm font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredHistory.map((item) => (
                <tr key={item.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="p-4">
                    <p className="font-medium text-foreground">{item.title || "Unknown Job"}</p>
                    <p className="text-sm text-muted-foreground md:hidden">{item.company || "Unknown"}</p>
                  </td>
                  <td className="p-4 hidden md:table-cell">
                    <p className="text-muted-foreground">{item.company || "Unknown"}</p>
                  </td>
                  <td className="p-4 hidden lg:table-cell">
                    <p className="text-muted-foreground">{item.location || "N/A"}</p>
                  </td>
                  <td className="p-4">
                    {(() => {
                      const risk = getRiskInfo(item.confidence, item.is_fraud);
                      return (
                        <div className="flex flex-col gap-1.5 min-w-[100px]">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold tracking-widest ${risk.bg}`}
                            style={{ color: risk.color, border: `1px solid ${risk.color}40` }}
                          >
                            {!item.is_fraud ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <AlertTriangle className="w-3 h-3" />
                            )}
                            {risk.label}
                          </span>
                          {/* Mini confidence bar */}
                          <div className="h-1 bg-gray-800 rounded-full overflow-hidden w-full">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${risk.bar}`}
                              style={{ width: `${item.confidence}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{item.confidence}% confidence</span>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="p-4 hidden sm:table-cell">
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(item.created_at), "MMM d, yyyy")}
                    </p>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setSelectedRecord(item)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteRecord(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredHistory.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">
              {historyData.length === 0
                ? "No analyses yet. Start by analyzing a job posting!"
                : "No results found"}
            </p>
          </div>
        )}
      </div>

      {/* View Detail Dialog */}
      <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedRecord?.is_fraud ? (
                <AlertTriangle className="w-5 h-5 text-destructive" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-success" />
              )}
              {selectedRecord?.title || "Job Analysis Details"}
            </DialogTitle>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Company</p>
                  <p className="font-medium">{selectedRecord.company || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{selectedRecord.location || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Salary</p>
                  <p className="font-medium">{selectedRecord.salary || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Confidence</p>
                  <p className="font-medium">{selectedRecord.confidence}%</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Status</p>
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${!selectedRecord.is_fraud
                    ? "bg-success/10 text-success"
                    : "bg-destructive/10 text-destructive"
                    }`}
                >
                  {!selectedRecord.is_fraud ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                  {!selectedRecord.is_fraud ? "Likely Legitimate" : "Potential Fraud"}
                </span>
              </div>

              {selectedRecord.factors && selectedRecord.factors.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Analysis Factors</p>
                  <ul className="space-y-1">
                    {selectedRecord.factors.map((factor, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <span className={selectedRecord.is_fraud ? "text-destructive" : "text-success"}>•</span>
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedRecord.description && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Description</p>
                  <p className="text-sm bg-secondary/50 p-3 rounded-lg">
                    {selectedRecord.description.length > 500
                      ? selectedRecord.description.substring(0, 500) + "..."
                      : selectedRecord.description}
                  </p>
                </div>
              )}

              <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                Analyzed on {format(new Date(selectedRecord.created_at), "MMMM d, yyyy 'at' h:mm a")}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HistoryPage;
