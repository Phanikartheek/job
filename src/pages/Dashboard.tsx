import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Shield,
  Search,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Activity,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ModelHealthWidget from "@/components/ModelHealthWidget";

interface AnalysisRecord {
  id: string;
  title: string | null;
  is_fraud: boolean;
  confidence: number;
  created_at: string;
}

interface StatsData {
  totalAnalyzed: number;
  fraudDetected: number;
  safeJobs: number;
  accuracyRate: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<StatsData>({
    totalAnalyzed: 0,
    fraudDetected: 0,
    safeJobs: 0,
    accuracyRate: 0,
  });
  const [recentAnalyses, setRecentAnalyses] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        const { data: analyses, error } = await supabase
          .from("job_analyses")
          .select("id, title, is_fraud, confidence, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const total = analyses?.length || 0;
        const fraud = analyses?.filter((a) => a.is_fraud).length || 0;
        const safe = total - fraud;
        const avgConfidence =
          total > 0
            ? analyses!.reduce((sum, a) => sum + a.confidence, 0) / total
            : 0;

        setStats({
          totalAnalyzed: total,
          fraudDetected: fraud,
          safeJobs: safe,
          accuracyRate: avgConfidence,
        });

        setRecentAnalyses(analyses?.slice(0, 5) || []);
      } catch (err) {
        console.error("Dashboard fetch failed:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    return `${diffDays}d ago`;
  };

  return (
    <div className="space-y-10">

      {/* =======================
          QUICK ACTION PANELS
      ======================== */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Single Job Analysis */}
        <div className="rounded-2xl bg-black border border-red-900/30 p-8 shadow-card">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-xl bg-red-600 shadow-danger">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-widest">
                  SINGLE JOB ANALYSIS
                </h3>
                <p className="text-sm text-gray-400">
                  Analyze one job posting manually
                </p>
              </div>
            </div>
            <Button
              size="lg"
              className="bg-red-600 hover:bg-red-700 text-white tracking-widest px-6"
              asChild
            >
              <Link to="/dashboard/analyze">
                <Search className="w-5 h-5 mr-2" />
                ANALYZE JOB
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Bulk Upload */}
        <div className="rounded-2xl bg-black border border-purple-900/30 p-8 shadow-card">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-xl bg-purple-700">
                <Upload className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-widest">
                  BULK ANALYSIS
                </h3>
                <p className="text-sm text-gray-400">
                  Upload CSV / Excel for batch fraud detection
                </p>
              </div>
            </div>
            <Button
              size="lg"
              className="bg-purple-700 hover:bg-purple-800 text-white tracking-widest px-6"
              asChild
            >
              <Link to="/dashboard/bulk-upload">
                <Upload className="w-5 h-5 mr-2" />
                BULK UPLOAD
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* MODEL HEALTH */}
      <ModelHealthWidget />

      {/* =======================
          STATS GRID
      ======================== */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">

        {/* Total */}
        <StatCard
          title="TOTAL SCANNED"
          value={loading ? "..." : stats.totalAnalyzed}
          icon={<Search className="w-5 h-5 text-white" />}
        />

        {/* Fraud */}
        <StatCard
          title="THREATS DETECTED"
          value={loading ? "..." : stats.fraudDetected}
          icon={<AlertTriangle className="w-5 h-5 text-white" />}
          danger
        />

        {/* Safe */}
        <StatCard
          title="SAFE POSTINGS"
          value={loading ? "..." : stats.safeJobs}
          icon={<CheckCircle2 className="w-5 h-5 text-white" />}
          success
        />

        {/* Confidence */}
        <StatCard
          title="AVG CONFIDENCE"
          value={loading ? "..." : `${stats.accuracyRate.toFixed(1)}%`}
          icon={<TrendingUp className="w-5 h-5 text-white" />}
        />
      </div>

      {/* =======================
          RECENT ANALYSES
      ======================== */}
      <div className="rounded-xl bg-black border border-red-900/30 overflow-hidden">
        <div className="p-6 border-b border-red-900/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-semibold text-white tracking-widest">
              RECENT SCANS
            </h3>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard/history" className="text-red-500">
              View all
            </Link>
          </Button>
        </div>

        <div className="divide-y divide-red-900/20">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              Loading...
            </div>
          ) : recentAnalyses.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No scans yet.
            </div>
          ) : (
            recentAnalyses.map((analysis) => (
              <div
                key={analysis.id}
                className="p-4 flex items-center gap-4 hover:bg-gray-900 transition-colors"
              >
                <div
                  className={`p-2 rounded-lg ${analysis.is_fraud
                      ? "bg-red-600 text-white"
                      : "bg-green-600 text-white"
                    }`}
                >
                  {analysis.is_fraud ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">
                    {analysis.title || "Untitled Analysis"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatTimeAgo(analysis.created_at)}
                  </p>
                </div>

                <div className="text-right">
                  <p
                    className={`text-sm font-semibold ${analysis.is_fraud
                        ? "text-red-500"
                        : "text-green-500"
                      }`}
                  >
                    {analysis.is_fraud ? "THREAT" : "SAFE"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {analysis.confidence}% confidence
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

/* ===========================
   STAT CARD COMPONENT
=========================== */

const StatCard = ({
  title,
  value,
  icon,
  danger,
  success,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  danger?: boolean;
  success?: boolean;
}) => {
  return (
    <div
      className={`p-6 rounded-xl bg-black border shadow-card ${danger
          ? "border-red-800/40"
          : success
            ? "border-green-800/40"
            : "border-red-900/20"
        }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div
          className={`p-3 rounded-lg ${danger
              ? "bg-red-600"
              : success
                ? "bg-green-600"
                : "bg-gray-800"
            }`}
        >
          {icon}
        </div>
      </div>

      <p className="text-3xl font-bold text-white mb-1">
        {value}
      </p>
      <p className="text-sm text-gray-500 tracking-widest">
        {title}
      </p>
    </div>
  );
};

export default Dashboard;
