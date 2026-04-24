import { useState, useEffect } from "react";
import { Settings, User, Bell, Shield, Palette, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { TwoFactorAuth } from "@/components/TwoFactorAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const SettingsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light" | "system">("dark");

  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    avatar_url: "",
  });

  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    weeklyReport: false,
    newFeatures: true,
  });

  // Load profile from database
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (error && error.code !== "PGRST116") {
          console.error("Error loading profile:", error);
        }

        if (data) {
          setProfile({
            full_name: data.full_name || "",
            email: data.email || user.email || "",
            avatar_url: data.avatar_url || "",
          });
        } else {
          setProfile({
            full_name: "",
            email: user.email || "",
            avatar_url: "",
          });
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  // Load theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "dark" | "light" | "system" | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  const handleThemeChange = (newTheme: "dark" | "light" | "system") => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    
    // Apply theme
    const root = document.documentElement;
    if (newTheme === "system") {
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", systemDark);
    } else {
      root.classList.toggle("dark", newTheme === "dark");
    }
    
    toast.success(`Theme changed to ${newTheme}`);
  };

  const handleSave = async () => {
    if (!user) {
      toast.error("You must be logged in to save settings");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          email: profile.email,
          avatar_url: profile.avatar_url,
        })
        .eq("user_id", user.id);

      if (error) {
        throw error;
      }

      toast.success("Settings saved successfully!");
    } catch (err: any) {
      console.error("Error saving profile:", err);
      toast.error("Failed to save settings: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = () => {
    navigate("/forgot-password");
    toast.info("Use the password reset flow to change your password");
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-accent-gradient shadow-glow">
          <Settings className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage your account preferences</p>
        </div>
      </div>

      {/* Profile section */}
      <div className="rounded-xl bg-card-gradient border border-border overflow-hidden">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <User className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Profile Information</h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-accent-gradient flex items-center justify-center text-2xl font-bold text-primary-foreground">
              {getInitials()}
            </div>
            <Button variant="outline" onClick={() => toast.info("Avatar upload coming soon!")}>
              Change Avatar
            </Button>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                placeholder="Enter your full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                placeholder="Enter your email"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Notifications section */}
      <div className="rounded-xl bg-card-gradient border border-border overflow-hidden">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <Bell className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Notification Preferences</h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Email Alerts</p>
              <p className="text-sm text-muted-foreground">
                Receive alerts when a fraudulent job is detected
              </p>
            </div>
            <Switch
              checked={notifications.emailAlerts}
              onCheckedChange={(checked) =>
                setNotifications({ ...notifications, emailAlerts: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Weekly Report</p>
              <p className="text-sm text-muted-foreground">
                Get a weekly summary of your job analyses
              </p>
            </div>
            <Switch
              checked={notifications.weeklyReport}
              onCheckedChange={(checked) =>
                setNotifications({ ...notifications, weeklyReport: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">New Features</p>
              <p className="text-sm text-muted-foreground">
                Be notified about new features and improvements
              </p>
            </div>
            <Switch
              checked={notifications.newFeatures}
              onCheckedChange={(checked) =>
                setNotifications({ ...notifications, newFeatures: checked })
              }
            />
          </div>
        </div>
      </div>

      {/* Security section */}
      <div className="rounded-xl bg-card-gradient border border-border overflow-hidden">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <Shield className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Security</h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Change Password</p>
              <p className="text-sm text-muted-foreground">Update your account password</p>
            </div>
            <Button variant="outline" onClick={handleChangePassword}>
              Update
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Two-Factor Authentication</p>
              <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  Configure
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Two-Factor Authentication</DialogTitle>
                </DialogHeader>
                <TwoFactorAuth />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Appearance section */}
      <div className="rounded-xl bg-card-gradient border border-border overflow-hidden">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <Palette className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Appearance</h2>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Theme</p>
              <p className="text-sm text-muted-foreground">Choose your preferred theme</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                size="sm"
                onClick={() => handleThemeChange("dark")}
              >
                Dark
              </Button>
              <Button
                variant={theme === "light" ? "default" : "outline"}
                size="sm"
                onClick={() => handleThemeChange("light")}
              >
                Light
              </Button>
              <Button
                variant={theme === "system" ? "default" : "outline"}
                size="sm"
                onClick={() => handleThemeChange("system")}
              >
                System
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <Button variant="hero" size="lg" onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Save className="w-5 h-5 mr-2" />
          )}
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
};

export default SettingsPage;
