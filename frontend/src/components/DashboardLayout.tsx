import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Shield,
  LayoutDashboard,
  Search,
  History,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Loader2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import NotificationDropdown from "@/components/NotificationDropdown";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Search, label: "Analyze Job", path: "/dashboard/analyze" },
  { icon: Upload, label: "Bulk Upload", path: "/dashboard/bulk-upload" },
  { icon: History, label: "History", path: "/dashboard/history" },
  { icon: Settings, label: "Settings", path: "/dashboard/settings" },
];

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string | null; email: string | null }>({
    full_name: null,
    email: null,
  });
  const navigate = useNavigate();
  const { user, signOut, loading } = useAuth();

  // Require authentication for all dashboard routes
  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [loading, user, navigate]);

  // Load user profile
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      try {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("user_id", user.id)
          .single();

        if (data) {
          setProfile({
            full_name: data.full_name,
            email: data.email || user.email,
          });
        } else {
          setProfile({
            full_name: null,
            email: user.email,
          });
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      }
    };

    loadProfile();
  }, [user]);

  const handleLogout = async () => {
    setSigningOut(true);
    try {
      await signOut();
      toast.success("Signed out successfully");
      navigate("/login");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out");
    } finally {
      setSigningOut(false);
    }
  };

  const getInitials = () => {
    if (profile.full_name) {
      return profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return profile.email?.slice(0, 2).toUpperCase() || "U";
  };

  const displayName = profile.full_name || "User";
  const displayEmail = profile.email || "";

  // Show loading spinner while auth is being resolved (handles OAuth callback)
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center scanline-overlay crt-overlay">
        <div className="flex flex-col items-center gap-6">
          {/* Cyberpunk loading animation */}
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-2 border-primary/30 border-t-primary animate-spin shadow-neon" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary animate-pulse" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <h2 className="font-cyber text-lg text-primary">INITIALIZING</h2>
            <p className="text-sm text-muted-foreground">Establishing secure connection...</p>
          </div>
          {/* Glitch bar effect */}
          <div className="w-48 h-1 bg-muted overflow-hidden rounded-full">
            <div className="h-full w-1/2 bg-gradient-to-r from-primary via-secondary to-primary animate-pulse"
              style={{ animation: 'pulse 1s ease-in-out infinite, slide 2s linear infinite' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex scanline-overlay crt-overlay bg-hex-pattern">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-72 bg-card/95 backdrop-blur-xl border-r border-primary/20 transform transition-transform duration-300 lg:transform-none shadow-neon",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyber-gradient shadow-neon animate-neon-pulse">
                  <Shield className="w-6 h-6 text-background" />
                </div>
                <div>
                  <h1 className="font-cyber text-xl text-primary">JobGuard</h1>
                  <p className="text-xs text-secondary">AI Detection</p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-muted-foreground hover:text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/dashboard"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group relative overflow-hidden",
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/30 shadow-neon"
                      : "text-muted-foreground hover:bg-primary/5 hover:text-primary hover:border-primary/20 border border-transparent"
                  )
                }
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium tracking-wide">{item.label}</span>
                <ChevronRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </NavLink>
            ))}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-primary/20">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20 mb-3">
              <div className="w-10 h-10 rounded-lg bg-cyber-gradient flex items-center justify-center text-sm font-bold text-background shadow-neon">
                {getInitials()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/30"
              onClick={handleLogout}
              disabled={signingOut}
            >
              {signingOut ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4 mr-2" />
              )}
              {signingOut ? "Signing out..." : "Sign out"}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-primary/20">
          <div className="flex items-center justify-between px-4 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-muted-foreground hover:text-primary transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h2 className="font-cyber text-lg text-primary tracking-wider">
                  Welcome{profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
                </h2>
                <p className="text-sm text-muted-foreground">Protect your job search today</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <NotificationDropdown />
              <div className="hidden md:flex w-10 h-10 rounded-lg bg-cyber-gradient items-center justify-center text-sm font-bold text-background shadow-neon">
                {getInitials()}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
