import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sphere, MeshDistortMaterial, Stars } from "@react-three/drei";
import * as THREE from "three";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Activity,
  Brain,
  RefreshCw,
  Shield,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Zap,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface MLOpsMetrics {
  modelStatus: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  avgConfidence: number;
  fraudDetected: number;
  safeDetected: number;
  feedbackCount: number;
  driftMetrics: {
    hasDrift: boolean;
    driftScore: number;
    driftType: string;
  };
  alerts: Array<{ type: string; message: string; severity: string }>;
  lastPredictionAt: string;
}

/* ---------------- 3D COMPONENTS ---------------- */

const NeuralCore = ({ health }: { health: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const color = health > 80 ? "#2dd4bf" : health > 50 ? "#fbbf24" : "#ef4444";

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1, 2]} />
        <MeshDistortMaterial
          color={color}
          distort={0.3}
          speed={2}
          roughness={0.2}
          metalness={0.8}
          emissive={color}
          emissiveIntensity={0.3}
        />
      </mesh>
    </Float>
  );
};

const DataParticles = ({ count = 8 }: { count?: number }) => {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        speed: Math.random() * 0.5 + 0.2,
        scale: Math.random() * 0.05 + 0.02,
      })),
    [count]
  );

  return (
    <>
      {particles.map((p) => (
        <OrbitingParticle key={p.id} {...p} index={p.id} />
      ))}
    </>
  );
};

const OrbitingParticle = ({
  speed,
  scale,
  index,
}: {
  speed: number;
  scale: number;
  index: number;
}) => {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime * speed + index;
    ref.current.position.set(
      Math.sin(t) * 2.5,
      Math.sin(t * 0.5) * 0.5,
      Math.cos(t) * 2.5
    );
  });

  return (
    <mesh ref={ref} scale={scale}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color="#2dd4bf" />
    </mesh>
  );
};

const HolographicRing = ({ radius, color }: { radius: number; color: string }) => {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = Math.PI / 2;
      ref.current.rotation.z = state.clock.elapsedTime * 0.2;
    }
  });

  return (
    <mesh ref={ref}>
      <torusGeometry args={[radius, 0.02, 8, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.4} />
    </mesh>
  );
};

const Scene3D = ({ health }: { health: number }) => (
  <>
    <ambientLight intensity={0.2} />
    <pointLight position={[10, 10, 10]} intensity={1} color="#00ffff" />
    <pointLight position={[-10, -10, -10]} intensity={0.5} color="#ff00ff" />
    <Stars radius={100} depth={50} count={300} factor={2} fade />
    <NeuralCore health={health} />
    <DataParticles />
    <HolographicRing radius={2.0} color="#00ffff" />
    <Sphere args={[3, 16, 16]}>
      <meshBasicMaterial color="#00ffff" transparent opacity={0.02} wireframe />
    </Sphere>
  </>
);

/* ---------------- MAIN WIDGET ---------------- */

const ModelHealthWidget = () => {
  const [metrics, setMetrics] = useState<MLOpsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [retraining, setRetraining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const retryCountRef = useRef(0);
  const { user, loading: authLoading } = useAuth();

  const getAuthHeaders = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    return accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
  }, []);

  const fetchMetrics = useCallback(async (showToast = false) => {
    if (authLoading || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const authHeaders = await getAuthHeaders();
      if (!authHeaders) throw new Error("No authentication token available");

      const { data, error: fnError } = await supabase.functions.invoke("mlops-metrics", {
        body: {},
        headers: authHeaders,
      });
      if (fnError) throw fnError;
      setMetrics(data);
      retryCountRef.current = 0;
      setRetryCount(0);
      if (showToast) toast.success("Metrics refreshed");
    } catch (err: any) {
      console.error("Failed to fetch MLOps metrics:", err);
      setError(err.message || "Failed to fetch metrics");
      if (retryCountRef.current < 3) {
        const delay = Math.pow(2, retryCountRef.current) * 1000;
        retryCountRef.current += 1;
        setRetryCount(retryCountRef.current);
        setTimeout(() => fetchMetrics(), delay);
      }
    } finally {
      setLoading(false);
    }
  }, [authLoading, user, getAuthHeaders]);

  const triggerRetraining = async () => {
    setRetraining(true);
    try {
      const authHeaders = await getAuthHeaders();
      if (!authHeaders) throw new Error("No authentication token available");

      const { data, error } = await supabase.functions.invoke("retrain-webhook", {
        body: { action: "trigger" },
        headers: authHeaders,
      });
      if (error) throw error;
      toast.success(data.message || "Retraining job queued successfully");
      fetchMetrics();
    } catch (err: any) {
      console.error("Failed to trigger retraining:", err);
      toast.error("Failed to trigger retraining");
    } finally {
      setRetraining(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) fetchMetrics();
  }, [authLoading, user]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => fetchMetrics(), 30000);
    return () => clearInterval(interval);
  }, [user, fetchMetrics]);

  const healthScore = metrics ? Math.round((metrics.accuracy + metrics.avgConfidence) / 2) : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy": return "text-success";
      case "warning": return "text-warning";
      case "critical": return "text-destructive";
      default: return "text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy": return <CheckCircle2 className="w-5 h-5" />;
      case "warning": return <AlertTriangle className="w-5 h-5" />;
      case "critical": return <AlertTriangle className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  if (authLoading) {
    return (
      <div className="relative rounded-lg bg-card/50 border border-primary/20 overflow-hidden backdrop-blur-sm">
        <div className="p-6 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading authentication...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative rounded-lg bg-card/50 border border-primary/20 overflow-hidden backdrop-blur-sm">
        <div className="p-6 text-center">
          <WifiOff className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Sign in to view model health</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-lg bg-card/50 border border-primary/20 overflow-hidden backdrop-blur-sm shadow-neon">
      <div className="absolute inset-0 opacity-40">
        <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
          <Scene3D health={healthScore} />
        </Canvas>
      </div>

      <div className="relative z-10 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-cyber-gradient shadow-neon animate-neon-pulse">
              <Brain className="w-6 h-6 text-background" />
            </div>
            <div>
              <h3 className="font-cyber text-lg text-primary tracking-wide">Model Health</h3>
              <p className="text-sm text-muted-foreground">Real-time ML metrics</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => fetchMetrics(true)} disabled={loading} className="hover:bg-primary/10 hover:text-primary">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {loading && !metrics ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin shadow-neon" />
              <p className="text-xs text-muted-foreground">
                {retryCount > 0 ? `Retrying... (${retryCount}/3)` : "Fetching metrics..."}
              </p>
            </div>
          </div>
        ) : error && !metrics ? (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <WifiOff className="w-6 h-6 text-destructive" />
            </div>
            <div className="text-center">
              <p className="text-sm text-destructive mb-1">Connection Error</p>
              <p className="text-xs text-muted-foreground max-w-[200px]">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => { setRetryCount(0); fetchMetrics(true); }} className="border-primary/30 hover:bg-primary/10">
              <RefreshCw className="w-3 h-3 mr-2" /> Retry
            </Button>
          </div>
        ) : metrics ? (
          <>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg mb-4 border ${metrics.modelStatus === "healthy" ? "bg-success/10 border-success/30"
              : metrics.modelStatus === "warning" ? "bg-warning/10 border-warning/30"
                : "bg-destructive/10 border-destructive/30"
              }`}>
              <span className={getStatusColor(metrics.modelStatus)}>{getStatusIcon(metrics.modelStatus)}</span>
              <span className={`font-cyber text-sm uppercase tracking-wide ${getStatusColor(metrics.modelStatus)}`}>{metrics.modelStatus}</span>
              <span className="text-muted-foreground text-sm ml-auto">{healthScore}% Health</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <MetricCard icon={<TrendingUp className="w-4 h-4" />} label="Accuracy" value={`${metrics.accuracy.toFixed(1)}%`} color="text-success" />
              <MetricCard icon={<Zap className="w-4 h-4" />} label="Precision" value={`${metrics.precision.toFixed(1)}%`} color="text-primary" />
              <MetricCard icon={<Activity className="w-4 h-4" />} label="Recall" value={`${metrics.recall.toFixed(1)}%`} color="text-secondary" />
              <MetricCard icon={<Shield className="w-4 h-4" />} label="F1 Score" value={`${metrics.f1Score.toFixed(1)}%`} color="text-success" />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20 mb-4">
              <div className="text-center">
                <p className="text-2xl font-cyber text-destructive">{metrics.fraudDetected}</p>
                <p className="text-xs text-muted-foreground">Fraud</p>
              </div>
              <div className="h-8 w-px bg-primary/20" />
              <div className="text-center">
                <p className="text-2xl font-cyber text-success">{metrics.safeDetected}</p>
                <p className="text-xs text-muted-foreground">Safe</p>
              </div>
              <div className="h-8 w-px bg-primary/20" />
              <div className="text-center">
                <p className="text-2xl font-cyber text-primary">{metrics.avgConfidence.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">Confidence</p>
              </div>
            </div>

            {metrics.driftMetrics && (
              <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 border ${metrics.driftMetrics.hasDrift ? "bg-warning/10 border-warning/30" : "bg-success/10 border-success/30"
                }`}>
                <Activity className={`w-4 h-4 ${metrics.driftMetrics.hasDrift ? "text-warning" : "text-success"}`} />
                <span className="text-sm">
                  {metrics.driftMetrics.hasDrift ? `Drift Detected: ${metrics.driftMetrics.driftType}` : "No Drift Detected"}
                </span>
              </div>
            )}

            {metrics.alerts && metrics.alerts.length > 0 && (
              <div className="space-y-2 mb-4">
                {metrics.alerts.slice(0, 2).map((alert, i) => (
                  <div key={i} className={`flex items-start gap-2 p-2 rounded-lg border ${alert.severity === "critical" ? "bg-destructive/10 border-destructive/30" : "bg-warning/10 border-warning/30"
                    }`}>
                    <AlertTriangle className={`w-4 h-4 mt-0.5 ${alert.severity === "critical" ? "text-destructive" : "text-warning"}`} />
                    <span className="text-sm text-muted-foreground">{alert.message}</span>
                  </div>
                ))}
              </div>
            )}

            <Button className="w-full bg-primary/10 border border-primary/30 hover:bg-primary/20 text-primary" variant="outline" onClick={triggerRetraining} disabled={retraining}>
              <RefreshCw className={`w-4 h-4 mr-2 ${retraining ? "animate-spin" : ""}`} />
              {retraining ? "Triggering..." : "Trigger Retraining"}
            </Button>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">No data available</div>
        )}
      </div>
    </div>
  );
};

const MetricCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) => (
  <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 backdrop-blur-sm">
    <div className={`flex items-center gap-1.5 mb-1 ${color}`}>{icon}</div>
    <p className={`text-lg font-cyber ${color}`}>{value}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
  </div>
);

export default ModelHealthWidget;
