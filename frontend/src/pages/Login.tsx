import { useState, Suspense, useEffect, useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float, MeshDistortMaterial, Sphere, Sparkles } from "@react-three/drei";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Eye, EyeOff, ArrowRight, Loader2, UserPlus, LogIn, Sparkles as SparklesIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";
import * as THREE from "three";

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

/* ---------------- 3D EFFECTS ---------------- */

const AnimeCrystalCore = () => {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.3;
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.3;
    }
    if (coreRef.current) {
      coreRef.current.rotation.y = -state.clock.elapsedTime * 0.8;
      coreRef.current.rotation.z = state.clock.elapsedTime * 0.5;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[0.8, 0]} />
        <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={3} transparent opacity={0.9} />
      </mesh>
      <mesh scale={1.3}>
        <icosahedronGeometry args={[0.8, 0]} />
        <meshStandardMaterial color="#0088ff" emissive="#0066cc" emissiveIntensity={0.5} transparent opacity={0.3} wireframe />
      </mesh>
    </group>
  );
};

const OrbitingSpheres = () => {
  const groupRef = useRef<THREE.Group>(null);
  const sphereCount = 6;
  const colors = ["#ff0080", "#00ffff", "#ffff00", "#ff00ff", "#00ff80", "#ff8000"];

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.6;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
    }
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: sphereCount }).map((_, i) => {
        const angle = (i / sphereCount) * Math.PI * 2;
        const radius = 3;
        return (
          <mesh key={i} position={[Math.cos(angle) * radius, Math.sin(angle * 2) * 0.5, Math.sin(angle) * radius]}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial color={colors[i]} emissive={colors[i]} emissiveIntensity={3} />
          </mesh>
        );
      })}
    </group>
  );
};

const Scene3D = () => (
  <>
    <ambientLight intensity={0.2} />
    <pointLight position={[0, 5, 0]} intensity={2} color="#00ffff" distance={15} />
    <pointLight position={[-5, 0, 5]} intensity={1.5} color="#ff00ff" distance={10} />
    <pointLight position={[5, 0, -5]} intensity={1.5} color="#ffff00" distance={10} />
    <AnimeCrystalCore />
    <OrbitingSpheres />
    <Sparkles count={100} scale={12} size={3} speed={0.4} color="#ffffff" />
    <Sparkles count={50} scale={10} size={4} speed={0.3} color="#00ffff" />
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <Sphere args={[1, 64, 64]} position={[-5, 2, -5]}>
        <MeshDistortMaterial color="#ff0080" distort={0.4} speed={3} roughness={0.1} metalness={0.9} transparent opacity={0.6} />
      </Sphere>
    </Float>
    <Float speed={1.5} rotationIntensity={0.8} floatIntensity={1.5}>
      <Sphere args={[0.8, 64, 64]} position={[5, -1, -4]}>
        <MeshDistortMaterial color="#00ff80" distort={0.5} speed={2} roughness={0.1} metalness={0.9} transparent opacity={0.5} />
      </Sphere>
    </Float>
    <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
  </>
);

/* ---------------- LOGIN ---------------- */

const Login = () => {
  const navigate = useNavigate();
  const { signIn, signUp, signInWithGoogle, user, loading: authLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "", fullName: "" });
  const [errors, setErrors] = useState({ email: "", password: "" });

  useEffect(() => {
    if (user && !authLoading) navigate("/dashboard");
  }, [user, authLoading, navigate]);

  const validateForm = () => {
    const newErrors = { email: "", password: "" };
    let isValid = true;
    const emailResult = emailSchema.safeParse(formData.email);
    if (!emailResult.success) { newErrors.email = emailResult.error.errors[0].message; isValid = false; }
    const passwordResult = passwordSchema.safeParse(formData.password);
    if (!passwordResult.success) { newErrors.password = passwordResult.error.errors[0].message; isValid = false; }
    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      if (isSignUp) {
        const { error } = await signUp(formData.email, formData.password, formData.fullName);
        if (error) {
          toast.error(error.message.includes("already registered") ? "This email is already registered." : error.message);
        } else {
          toast.success("Account created successfully!");
          navigate("/dashboard");
        }
      } else {
        const { error } = await signIn(formData.email, formData.password);
        if (error) {
          toast.error(error.message.includes("Invalid login credentials") ? "Invalid email or password." : error.message);
        } else {
          toast.success("Welcome back!");
          navigate("/dashboard");
        }
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      toast.error("Google sign in failed. Please try again.");
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            <SparklesIcon className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-muted-foreground animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* 3D Animation Side */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#0a0a1a] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,255,255,0.1)_0%,_transparent_70%)]" />
        <Canvas camera={{ position: [0, 2, 10], fov: 50 }}>
          <Suspense fallback={null}>
            <Scene3D />
          </Suspense>
        </Canvas>
        <div className="absolute inset-0 flex flex-col items-center justify-center p-12 pointer-events-none">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 backdrop-blur-sm animate-pulse">
              <SparklesIcon className="w-4 h-4 text-cyan-400" />
              <span className="text-sm text-cyan-400 font-medium">AI-Powered Security</span>
            </div>
            <h2 className="text-5xl font-bold text-white leading-tight drop-shadow-[0_0_20px_rgba(0,255,255,0.5)]">
              Next-Gen <br />
              <span className="bg-gradient-to-r from-cyan-400 via-pink-500 to-yellow-400 bg-clip-text text-transparent">Fraud Detection</span>
            </h2>
            <p className="text-lg text-cyan-100/70 max-w-md">Advanced machine learning protects you from fraudulent job postings</p>
          </div>
        </div>
        <div className="absolute top-0 left-0 w-32 h-32 border-l-2 border-t-2 border-cyan-500/50" />
        <div className="absolute bottom-0 right-0 w-32 h-32 border-r-2 border-b-2 border-pink-500/50" />
      </div>

      {/* Login Form Side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 bg-card relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-pink-500/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2 animate-pulse" />

        <div className="w-full max-w-md space-y-8 relative z-10">
          <div className="flex items-center gap-3 justify-center lg:justify-start">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500 via-purple-500 to-pink-500 shadow-[0_0_30px_rgba(0,255,255,0.4)]">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">JobGuard AI</h1>
              <p className="text-sm text-muted-foreground">Fraud Detection System</p>
            </div>
          </div>

          <div className="flex gap-3 p-1.5 rounded-2xl bg-secondary/50 backdrop-blur-sm border border-border/50">
            <button type="button" onClick={() => setIsSignUp(false)} className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all duration-300 ${!isSignUp ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25' : 'text-muted-foreground hover:text-foreground'}`}>
              <LogIn className="w-4 h-4" /> Sign In
            </button>
            <button type="button" onClick={() => setIsSignUp(true)} className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all duration-300 ${isSignUp ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg shadow-pink-500/25' : 'text-muted-foreground hover:text-foreground'}`}>
              <UserPlus className="w-4 h-4" /> Register
            </button>
          </div>

          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-foreground">{isSignUp ? "Create your account" : "Welcome back"}</h2>
            <p className="text-muted-foreground">{isSignUp ? "Join thousands protecting themselves from job scams" : "Sign in to access your fraud detection dashboard"}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" placeholder="John Doe" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} className="h-12 rounded-xl" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={formData.email} onChange={(e) => { setFormData({ ...formData, email: e.target.value }); setErrors({ ...errors, email: "" }); }} className={`h-12 rounded-xl ${errors.email ? "border-destructive" : ""}`} required />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" value={formData.password} onChange={(e) => { setFormData({ ...formData, password: e.target.value }); setErrors({ ...errors, password: "" }); }} className={`h-12 rounded-xl pr-12 ${errors.password ? "border-destructive" : ""}`} required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>

            {!isSignUp && (
              <div className="flex items-center justify-end">
                <Link to="/forgot-password" className="text-sm text-cyan-500 hover:text-cyan-400 font-medium">Forgot password?</Link>
              </div>
            )}

            <Button type="submit" disabled={isLoading} className={`w-full h-12 rounded-xl font-semibold ${isSignUp ? 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600' : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600'} text-white`}>
              {isLoading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />{isSignUp ? "Creating..." : "Signing in..."}</> : <>{isSignUp ? "Create Account" : "Sign In"}<ArrowRight className="w-5 h-5 ml-2" /></>}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground pt-4">
            By continuing, you agree to our <a href="#" className="text-cyan-500 hover:text-cyan-400">Terms</a> and <a href="#" className="text-cyan-500 hover:text-cyan-400">Privacy Policy</a>
          </p>

        </div>
      </div>
    </div>
  );
};

export default Login;
