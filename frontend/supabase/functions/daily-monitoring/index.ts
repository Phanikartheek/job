// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MonitoringReport {
  timestamp: string;
  summary: {
    totalPredictions: number;
    todayPredictions: number;
    weeklyPredictions: number;
    fraudDetected: number;
    safeDetected: number;
    avgConfidence: number;
  };
  performance: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    feedbackCount: number;
  };
  drift: {
    detected: boolean;
    score: number;
    details: string[];
  };
  alerts: {
    type: string;
    severity: "info" | "warning" | "critical";
    message: string;
  }[];
  health: "healthy" | "degraded" | "critical";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Daily monitoring job started at:", new Date().toISOString());

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch all data
    const [analysesResult, feedbackResult, profilesResult] = await Promise.all([
      supabase.from("job_analyses").select("*").order("created_at", { ascending: false }),
      supabase.from("prediction_feedback").select("*"),
      supabase.from("profiles").select("user_id, email"),
    ]);

    if (analysesResult.error) throw analysesResult.error;
    if (feedbackResult.error) throw feedbackResult.error;

    const analyses = analysesResult.data || [];
    const feedback = feedbackResult.data || [];
    const profiles = profilesResult.data || [];

    // Calculate time-based metrics
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const todayPredictions = analyses.filter(
      (a) => new Date(a.created_at) >= todayStart
    ).length;

    const weeklyPredictions = analyses.filter(
      (a) => new Date(a.created_at) >= weekAgo
    ).length;

    const totalPredictions = analyses.length;
    const fraudDetected = analyses.filter((a) => a.is_fraud).length;
    const safeDetected = totalPredictions - fraudDetected;
    const avgConfidence = totalPredictions > 0
      ? analyses.reduce((sum, a) => sum + (a.confidence || 0), 0) / totalPredictions
      : 0;

    // Calculate performance metrics from feedback
    const feedbackCount = feedback.filter((f) => f.feedback_type).length;
    const correctPredictions = feedback.filter((f) => f.feedback_type === "correct").length;
    const accuracy = feedbackCount > 0 ? (correctPredictions / feedbackCount) * 100 : 0;

    // Confusion matrix
    const truePositives = feedback.filter(
      (f) => f.predicted_fraud && f.actual_fraud === true
    ).length;
    const falsePositives = feedback.filter(
      (f) => f.predicted_fraud && f.actual_fraud === false
    ).length;
    const trueNegatives = feedback.filter(
      (f) => !f.predicted_fraud && f.actual_fraud === false
    ).length;
    const falseNegatives = feedback.filter(
      (f) => !f.predicted_fraud && f.actual_fraud === true
    ).length;

    const precision = truePositives + falsePositives > 0
      ? (truePositives / (truePositives + falsePositives)) * 100
      : 0;
    const recall = truePositives + falseNegatives > 0
      ? (truePositives / (truePositives + falseNegatives)) * 100
      : 0;
    const f1Score = precision + recall > 0
      ? (2 * precision * recall) / (precision + recall)
      : 0;

    // Drift detection
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const baselineAnalyses = analyses.filter((a) => {
      const date = new Date(a.created_at);
      return date >= twoWeeksAgo && date < weekAgo;
    });

    const currentAnalyses = analyses.filter((a) => {
      const date = new Date(a.created_at);
      return date >= weekAgo;
    });

    let driftScore = 0;
    const driftDetails: string[] = [];

    if (baselineAnalyses.length >= 5 && currentAnalyses.length >= 5) {
      const baselineConfidence = baselineAnalyses.reduce((sum, a) => sum + (a.confidence || 0), 0) / baselineAnalyses.length;
      const currentConfidence = currentAnalyses.reduce((sum, a) => sum + (a.confidence || 0), 0) / currentAnalyses.length;

      const confidenceChange = Math.abs(currentConfidence - baselineConfidence);
      if (confidenceChange > 15) {
        driftScore += 0.4;
        driftDetails.push(`Confidence shifted by ${confidenceChange.toFixed(1)}%`);
      }

      const baselineFraudRate = (baselineAnalyses.filter((a) => a.is_fraud).length / baselineAnalyses.length) * 100;
      const currentFraudRate = (currentAnalyses.filter((a) => a.is_fraud).length / currentAnalyses.length) * 100;

      const fraudRateChange = Math.abs(currentFraudRate - baselineFraudRate);
      if (fraudRateChange > 20) {
        driftScore += 0.3;
        driftDetails.push(`Fraud rate changed by ${fraudRateChange.toFixed(1)}%`);
      }
    }

    const driftDetected = driftScore > 0.3;

    // Generate alerts
    const alerts: MonitoringReport["alerts"] = [];

    if (feedbackCount > 0 && accuracy < 50) {
      alerts.push({
        type: "accuracy",
        severity: "critical",
        message: `Critical: Model accuracy is ${accuracy.toFixed(1)}%`,
      });
    } else if (feedbackCount > 0 && accuracy < 70) {
      alerts.push({
        type: "accuracy",
        severity: "warning",
        message: `Warning: Model accuracy dropped to ${accuracy.toFixed(1)}%`,
      });
    }

    if (driftDetected) {
      alerts.push({
        type: "drift",
        severity: driftScore > 0.6 ? "critical" : "warning",
        message: `Drift detected: ${driftDetails.join("; ")}`,
      });
    }

    if (avgConfidence < 60) {
      alerts.push({
        type: "confidence",
        severity: "warning",
        message: `Low average confidence: ${avgConfidence.toFixed(1)}%`,
      });
    }

    if (todayPredictions > 0) {
      alerts.push({
        type: "activity",
        severity: "info",
        message: `${todayPredictions} prediction(s) today, ${weeklyPredictions} this week`,
      });
    }

    // Determine overall health
    let health: MonitoringReport["health"] = "healthy";
    if (alerts.some((a) => a.severity === "critical")) {
      health = "critical";
    } else if (alerts.some((a) => a.severity === "warning")) {
      health = "degraded";
    }

    // Build report
    const report: MonitoringReport = {
      timestamp: now.toISOString(),
      summary: {
        totalPredictions,
        todayPredictions,
        weeklyPredictions,
        fraudDetected,
        safeDetected,
        avgConfidence: Math.round(avgConfidence * 10) / 10,
      },
      performance: {
        accuracy: Math.round(accuracy * 10) / 10,
        precision: Math.round(precision * 10) / 10,
        recall: Math.round(recall * 10) / 10,
        f1Score: Math.round(f1Score * 10) / 10,
        feedbackCount,
      },
      drift: {
        detected: driftDetected,
        score: Math.round(driftScore * 100) / 100,
        details: driftDetails,
      },
      alerts,
      health,
    };

    console.log("Daily monitoring report:", JSON.stringify(report, null, 2));

    // Send email alerts if there are critical or warning issues
    const criticalAlerts = alerts.filter((a) => a.severity === "critical" || a.severity === "warning");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (criticalAlerts.length > 0 && resendApiKey) {
      try {
        const { Resend } = await import("https://esm.sh/resend@2.0.0");
        const resend = new Resend(resendApiKey);

        // Get unique admin emails (in production, have a separate admin table)
        const adminEmails = [...new Set(profiles.map((p) => p.email).filter(Boolean))].slice(0, 5);

        if (adminEmails.length > 0) {
          const alertsHtml = criticalAlerts
            .map((a) => `
              <div style="padding: 12px; margin: 8px 0; border-radius: 8px; background: ${
                a.severity === "critical" ? "rgba(239, 68, 68, 0.1)" : "rgba(245, 158, 11, 0.1)"
              }; border-left: 4px solid ${a.severity === "critical" ? "#ef4444" : "#f59e0b"};">
                <strong>${a.severity.toUpperCase()}:</strong> ${a.message}
              </div>
            `)
            .join("");

          await resend.emails.send({
            from: "JobGuard MLOps <onboarding@resend.dev>",
            to: adminEmails as string[],
            subject: `[JobGuard] Daily Monitoring Alert - ${health.toUpperCase()}`,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f0f0f; color: #fff; padding: 40px; }
                  .container { max-width: 600px; margin: 0 auto; background: #1a1a1a; border-radius: 16px; padding: 32px; border: 1px solid #333; }
                  .header { text-align: center; margin-bottom: 24px; }
                  .logo { font-size: 24px; font-weight: bold; color: #14b8a6; }
                  .status { display: inline-block; padding: 8px 16px; border-radius: 8px; font-weight: 600; margin: 16px 0; }
                  .status-critical { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
                  .status-degraded { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
                  .status-healthy { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
                  .metrics { background: rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 20px; margin: 20px 0; }
                  .metric-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
                  .metric-row:last-child { border-bottom: none; }
                  .metric-label { color: #888; }
                  .metric-value { font-weight: 600; color: #14b8a6; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <div class="logo">🛡️ JobGuard Daily Monitoring</div>
                  </div>
                  
                  <div style="text-align: center;">
                    <span class="status status-${health}">System Status: ${health.toUpperCase()}</span>
                  </div>
                  
                  <h3 style="color: #fff; margin-top: 24px;">Alerts</h3>
                  ${alertsHtml}
                  
                  <div class="metrics">
                    <h4 style="color: #fff; margin-top: 0;">Summary</h4>
                    <div class="metric-row">
                      <span class="metric-label">Total Predictions</span>
                      <span class="metric-value">${totalPredictions}</span>
                    </div>
                    <div class="metric-row">
                      <span class="metric-label">Weekly Predictions</span>
                      <span class="metric-value">${weeklyPredictions}</span>
                    </div>
                    <div class="metric-row">
                      <span class="metric-label">Accuracy</span>
                      <span class="metric-value">${accuracy.toFixed(1)}%</span>
                    </div>
                    <div class="metric-row">
                      <span class="metric-label">Avg Confidence</span>
                      <span class="metric-value">${avgConfidence.toFixed(1)}%</span>
                    </div>
                    <div class="metric-row">
                      <span class="metric-label">Drift Detected</span>
                      <span class="metric-value">${driftDetected ? "Yes" : "No"}</span>
                    </div>
                  </div>
                  
                  <p style="color: #666; font-size: 12px; text-align: center; margin-top: 24px;">
                    This is an automated daily monitoring report from JobGuard MLOps.
                  </p>
                </div>
              </body>
              </html>
            `,
          });

          console.log(`Sent monitoring alerts to ${adminEmails.length} recipients`);
        }
      } catch (emailError) {
        console.error("Failed to send monitoring email:", emailError);
      }
    }

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Daily monitoring error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Monitoring failed",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
