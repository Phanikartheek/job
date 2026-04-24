import { useState, useEffect } from "react";
import { Shield, Loader2, Check, X, Key, Smartphone, Copy, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type MFAStatus = "loading" | "not-enrolled" | "enrolled" | "verify";

export const TwoFactorAuth = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<MFAStatus>("loading");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);

  // Check current MFA status
  useEffect(() => {
    const checkMFAStatus = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase.auth.mfa.listFactors();
        if (error) throw error;

        const totpFactor = data.totp.find((f) => f.status === "verified");
        if (totpFactor) {
          setFactorId(totpFactor.id);
          setStatus("enrolled");
        } else {
          setStatus("not-enrolled");
        }
      } catch (error) {
        console.error("Error checking MFA status:", error);
        setStatus("not-enrolled");
      }
    };

    checkMFAStatus();
  }, [user]);

  const handleEnroll = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Authenticator App",
      });

      if (error) throw error;

      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setStatus("verify");
    } catch (error: any) {
      console.error("Error enrolling MFA:", error);
      toast.error("Failed to set up 2FA: " + error.message);
    }
  };

  const handleVerify = async () => {
    if (!factorId || verifyCode.length !== 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }

    setVerifying(true);
    try {
      const { data: challengeData, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: verifyCode,
      });

      if (verifyError) throw verifyError;

      setStatus("enrolled");
      toast.success("Two-factor authentication enabled successfully!");
    } catch (error: any) {
      console.error("Error verifying MFA:", error);
      toast.error("Invalid code. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const handleUnenroll = async () => {
    if (!factorId) return;

    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;

      setFactorId(null);
      setStatus("not-enrolled");
      toast.success("Two-factor authentication disabled");
    } catch (error: any) {
      console.error("Error unenrolling MFA:", error);
      toast.error("Failed to disable 2FA: " + error.message);
    }
  };

  const copySecret = async () => {
    if (!secret) return;
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    toast.success("Secret copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/20">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Two-Factor Authentication</h3>
          <p className="text-sm text-muted-foreground">
            Add an extra layer of security to your account
          </p>
        </div>
      </div>

      {status === "enrolled" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-success/10 border border-success/30">
            <CheckCircle2 className="w-5 h-5 text-success" />
            <div>
              <p className="font-medium text-foreground">2FA is enabled</p>
              <p className="text-sm text-muted-foreground">
                Your account is protected with two-factor authentication
              </p>
            </div>
          </div>
          <Button variant="destructive" onClick={handleUnenroll} className="w-full">
            <X className="w-4 h-4 mr-2" />
            Disable Two-Factor Authentication
          </Button>
        </div>
      )}

      {status === "not-enrolled" && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-start gap-3">
              <Smartphone className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-foreground">How it works</p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                  <li>1. Download an authenticator app (Google Authenticator, Authy, etc.)</li>
                  <li>2. Scan the QR code or enter the secret key</li>
                  <li>3. Enter the 6-digit code to verify</li>
                  <li>4. You'll need the code each time you sign in</li>
                </ul>
              </div>
            </div>
          </div>
          <Button onClick={handleEnroll} className="w-full">
            <Key className="w-4 h-4 mr-2" />
            Set Up Two-Factor Authentication
          </Button>
        </div>
      )}

      {status === "verify" && (
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Scan this QR code with your authenticator app
            </p>
            {qrCode && (
              <div className="inline-block p-4 bg-white rounded-lg">
                <img src={qrCode} alt="QR Code for 2FA" className="w-48 h-48" />
              </div>
            )}
          </div>

          {secret && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">
                Or enter this secret key manually:
              </Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-3 rounded-lg bg-muted text-foreground text-sm font-mono break-all">
                  {secret}
                </code>
                <Button variant="outline" size="icon" onClick={copySecret}>
                  {copied ? (
                    <Check className="w-4 h-4 text-success" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="verify-code" className="text-foreground">
              Enter the 6-digit code from your app
            </Label>
            <Input
              id="verify-code"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="text-center text-2xl tracking-widest font-mono"
              maxLength={6}
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setStatus("not-enrolled")}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleVerify}
              disabled={verifyCode.length !== 6 || verifying}
              className="flex-1"
            >
              {verifying ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Verify & Enable
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
