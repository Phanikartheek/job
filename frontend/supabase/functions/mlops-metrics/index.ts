// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface KeywordStats {
  keyword: string;
  count: number;
  fraudCount: number;
  safeCount: number;
  fraudPercentage: number;
}

interface ConfidenceStats {
  minConfidence: number;
  maxConfidence: number;
  avgConfidence: number;
  medianConfidence: number;
  highConfidenceCount: number;
  mediumConfidenceCount: number;
  lowConfidenceCount: number;
}

interface DriftMetrics {
  hasDrift: boolean;
  driftScore: number;
  driftType: "none" | "confidence" | "distribution" | "accuracy" | "multiple";
  details: string[];
  baselineConfidence: number;
  currentConfidence: number;
  baselineFraudRate: number;
  currentFraudRate: number;
}

interface MLOpsMetrics {
  totalPredictions: number;
  fraudDetected: number;
  safeDetected: number;
  avgConfidence: number;
  feedbackCount: number;
  correctPredictions: number;
  incorrectPredictions: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  modelVersion: string;
  modelStatus: "healthy" | "degraded" | "critical";
  lastPredictionAt: string | null;
  predictionsByDay: { date: string; fraud: number; safe: number }[];
  confidenceDistribution: { range: string; count: number }[];
  topKeywords: KeywordStats[];
  confidenceStats: ConfidenceStats;
  driftMetrics: DriftMetrics;
  alerts: { type: string; message: string; severity: "info" | "warning" | "critical" }[];
}

// Calculate drift detection metrics
function calculateDriftMetrics(analyses: any[], feedbackData: any[]): DriftMetrics {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // Split data into baseline (7-14 days ago) and current (last 7 days)
  const baselineAnalyses = analyses.filter((a) => {
    const date = new Date(a.created_at);
    return date >= fourteenDaysAgo && date < sevenDaysAgo;
  });

  const currentAnalyses = analyses.filter((a) => {
    const date = new Date(a.created_at);
    return date >= sevenDaysAgo;
  });

  // Calculate baseline metrics
  const baselineConfidence = baselineAnalyses.length > 0
    ? baselineAnalyses.reduce((sum, a) => sum + (a.confidence || 0), 0) / baselineAnalyses.length
    : 0;
  const baselineFraudRate = baselineAnalyses.length > 0
    ? (baselineAnalyses.filter((a) => a.is_fraud).length / baselineAnalyses.length) * 100
    : 0;

  // Calculate current metrics
  const currentConfidence = currentAnalyses.length > 0
    ? currentAnalyses.reduce((sum, a) => sum + (a.confidence || 0), 0) / currentAnalyses.length
    : 0;
  const currentFraudRate = currentAnalyses.length > 0
    ? (currentAnalyses.filter((a) => a.is_fraud).length / currentAnalyses.length) * 100
    : 0;

  // Detect drift
  const details: string[] = [];
  let driftScore = 0;
  const driftTypes: string[] = [];

  // Confidence drift (>15% change)
  if (baselineAnalyses.length >= 5 && currentAnalyses.length >= 5) {
    const confidenceChange = Math.abs(currentConfidence - baselineConfidence);
    if (confidenceChange > 15) {
      driftScore += 0.4;
      driftTypes.push("confidence");
      details.push(`Confidence shifted by ${confidenceChange.toFixed(1)}% (${baselineConfidence.toFixed(1)}% → ${currentConfidence.toFixed(1)}%)`);
    }

    // Distribution drift (fraud rate change >20%)
    const fraudRateChange = Math.abs(currentFraudRate - baselineFraudRate);
    if (fraudRateChange > 20) {
      driftScore += 0.3;
      driftTypes.push("distribution");
      details.push(`Fraud detection rate changed by ${fraudRateChange.toFixed(1)}% (${baselineFraudRate.toFixed(1)}% → ${currentFraudRate.toFixed(1)}%)`);
    }
  }

  // Accuracy drift from feedback
  const recentFeedback = feedbackData.filter((f) => {
    const date = new Date(f.created_at);
    return date >= sevenDaysAgo && f.feedback_type;
  });

  const olderFeedback = feedbackData.filter((f) => {
    const date = new Date(f.created_at);
    return date >= fourteenDaysAgo && date < sevenDaysAgo && f.feedback_type;
  });

  if (recentFeedback.length >= 3 && olderFeedback.length >= 3) {
    const recentAccuracy = (recentFeedback.filter((f) => f.feedback_type === "correct").length / recentFeedback.length) * 100;
    const olderAccuracy = (olderFeedback.filter((f) => f.feedback_type === "correct").length / olderFeedback.length) * 100;
    const accuracyDrop = olderAccuracy - recentAccuracy;

    if (accuracyDrop > 15) {
      driftScore += 0.3;
      driftTypes.push("accuracy");
      details.push(`Accuracy dropped by ${accuracyDrop.toFixed(1)}% (${olderAccuracy.toFixed(1)}% → ${recentAccuracy.toFixed(1)}%)`);
    }
  }

  // Determine drift type
  let driftType: DriftMetrics["driftType"] = "none";
  if (driftTypes.length > 1) {
    driftType = "multiple";
  } else if (driftTypes.length === 1) {
    driftType = driftTypes[0] as DriftMetrics["driftType"];
  }

  return {
    hasDrift: driftScore > 0.3,
    driftScore: Math.min(driftScore, 1),
    driftType,
    details,
    baselineConfidence: Math.round(baselineConfidence * 10) / 10,
    currentConfidence: Math.round(currentConfidence * 10) / 10,
    baselineFraudRate: Math.round(baselineFraudRate * 10) / 10,
    currentFraudRate: Math.round(currentFraudRate * 10) / 10,
  };
}

// Send email alert
async function sendEmailAlert(
  email: string,
  alertType: string,
  message: string,
  metrics: Partial<MLOpsMetrics>
) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.log("RESEND_API_KEY not configured, skipping email alert");
    return;
  }
  const { Resend } = await import("https://esm.sh/resend@2.0.0");
  const resend = new Resend(resendApiKey);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f0f0f; color: #ffffff; padding: 40px; }
        .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%); border-radius: 16px; padding: 32px; border: 1px solid #333; }
        .header { text-align: center; margin-bottom: 24px; }
        .logo { font-size: 24px; font-weight: bold; color: #14b8a6; }
        .alert-badge { display: inline-block; padding: 8px 16px; border-radius: 8px; font-weight: 600; margin-bottom: 16px; }
        .alert-critical { background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); }
        .alert-warning { background: rgba(245, 158, 11, 0.2); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); }
        .message { font-size: 18px; margin-bottom: 24px; line-height: 1.6; }
        .metrics { background: rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 20px; margin-bottom: 24px; }
        .metric-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
        .metric-row:last-child { border-bottom: none; }
        .metric-label { color: #888; }
        .metric-value { font-weight: 600; color: #14b8a6; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 24px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🛡️ JobGuard MLOps</div>
        </div>
        
        <div style="text-align: center;">
          <span class="alert-badge ${alertType === 'critical' ? 'alert-critical' : 'alert-warning'}">
            ${alertType === 'critical' ? '🚨 Critical Alert' : '⚠️ Warning Alert'}
          </span>
        </div>
        
        <p class="message">${message}</p>
        
        <div class="metrics">
          <div class="metric-row">
            <span class="metric-label">Model Status</span>
            <span class="metric-value">${metrics.modelStatus || 'Unknown'}</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Current Accuracy</span>
            <span class="metric-value">${metrics.accuracy?.toFixed(1) || 0}%</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Total Predictions</span>
            <span class="metric-value">${metrics.totalPredictions || 0}</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Avg Confidence</span>
            <span class="metric-value">${metrics.avgConfidence?.toFixed(1) || 0}%</span>
          </div>
          ${metrics.driftMetrics?.hasDrift ? `
          <div class="metric-row">
            <span class="metric-label">Drift Detected</span>
            <span class="metric-value" style="color: #f59e0b;">Yes (${(metrics.driftMetrics.driftScore * 100).toFixed(0)}%)</span>
          </div>
          ` : ''}
        </div>
        
        <div class="footer">
          <p>This is an automated alert from JobGuard MLOps monitoring system.</p>
          <p>Please review your model performance and take necessary action.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const { error } = await resend.emails.send({
      from: "JobGuard MLOps <onboarding@resend.dev>",
      to: [email],
      subject: `[JobGuard] ${alertType === 'critical' ? '🚨 Critical' : '⚠️ Warning'}: ${message.substring(0, 50)}...`,
      html,
    });

    if (error) {
      console.error("Failed to send email alert:", error);
    } else {
      console.log(`Email alert sent to ${email}`);
    }
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Fetching MLOps metrics for user: ${user.id}`);

    // Parse request body for optional parameters
    let sendAlerts = false;
    try {
      const body = await req.json();
      sendAlerts = body?.sendAlerts || false;
    } catch {
      // No body or invalid JSON, use defaults
    }

    // Fetch analyses and feedback in parallel for efficiency
    const [analysesResult, feedbackResult, profileResult] = await Promise.all([
      supabase
        .from("job_analyses")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("prediction_feedback")
        .select("*")
        .eq("user_id", user.id),
      supabase
        .from("profiles")
        .select("email")
        .eq("user_id", user.id)
        .single()
    ]);

    if (analysesResult.error) throw analysesResult.error;
    if (feedbackResult.error) throw feedbackResult.error;

    const analyses = analysesResult.data || [];
    const feedback = feedbackResult.data || [];
    const userEmail = profileResult.data?.email || user.email;

    console.log(`Found ${analyses.length} analyses and ${feedback.length} feedback records`);

    // Calculate core metrics
    const totalPredictions = analyses.length;
    const fraudDetected = analyses.filter((a) => a.is_fraud).length;
    const safeDetected = totalPredictions - fraudDetected;
    const avgConfidence = totalPredictions > 0
      ? analyses.reduce((sum, a) => sum + (a.confidence || 0), 0) / totalPredictions
      : 0;

    // Feedback metrics
    const feedbackCount = feedback.filter((f) => f.feedback_type).length;
    const correctPredictions = feedback.filter((f) => f.feedback_type === "correct").length;
    const incorrectPredictions = feedback.filter((f) => f.feedback_type === "incorrect").length;
    const accuracy = feedbackCount > 0 ? (correctPredictions / feedbackCount) * 100 : 0;

    // Confusion matrix metrics
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

    // Calculate drift metrics
    const driftMetrics = calculateDriftMetrics(analyses, feedback);

    // Predictions by day (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split("T")[0];
    });

    const predictionsByDay = last7Days.map((date) => {
      const dayAnalyses = analyses.filter(
        (a) => a.created_at.split("T")[0] === date
      );
      return {
        date,
        fraud: dayAnalyses.filter((a) => a.is_fraud).length,
        safe: dayAnalyses.filter((a) => !a.is_fraud).length,
      };
    });

    // Confidence distribution
    const confidenceRanges = [
      { range: "0-20%", min: 0, max: 20 },
      { range: "21-40%", min: 21, max: 40 },
      { range: "41-60%", min: 41, max: 60 },
      { range: "61-80%", min: 61, max: 80 },
      { range: "81-100%", min: 81, max: 100 },
    ];

    const confidenceDistribution = confidenceRanges.map(({ range, min, max }) => ({
      range,
      count: analyses.filter((a) => {
        const conf = a.confidence || 0;
        return conf >= min && conf <= max;
      }).length,
    }));

    // Extract and analyze keywords from factors
    const keywordMap = new Map<string, { count: number; fraudCount: number; safeCount: number }>();

    analyses.forEach((analysis) => {
      const factors = analysis.factors || [];
      factors.forEach((factor: string) => {
        const cleanedFactor = factor.trim().toLowerCase();
        if (cleanedFactor.length > 3) {
          const existing = keywordMap.get(cleanedFactor) || { count: 0, fraudCount: 0, safeCount: 0 };
          existing.count += 1;
          if (analysis.is_fraud) {
            existing.fraudCount += 1;
          } else {
            existing.safeCount += 1;
          }
          keywordMap.set(cleanedFactor, existing);
        }
      });
    });

    const topKeywords: KeywordStats[] = Array.from(keywordMap.entries())
      .map(([keyword, stats]) => ({
        keyword,
        count: stats.count,
        fraudCount: stats.fraudCount,
        safeCount: stats.safeCount,
        fraudPercentage: stats.count > 0 ? Math.round((stats.fraudCount / stats.count) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Confidence statistics
    const confidenceValues = analyses.map((a) => a.confidence || 0);
    const sortedConfidence = [...confidenceValues].sort((a, b) => a - b);

    const confidenceStats: ConfidenceStats = {
      minConfidence: confidenceValues.length > 0 ? Math.min(...confidenceValues) : 0,
      maxConfidence: confidenceValues.length > 0 ? Math.max(...confidenceValues) : 0,
      avgConfidence: Math.round(avgConfidence * 10) / 10,
      medianConfidence: sortedConfidence.length > 0
        ? sortedConfidence[Math.floor(sortedConfidence.length / 2)]
        : 0,
      highConfidenceCount: confidenceValues.filter((c) => c >= 80).length,
      mediumConfidenceCount: confidenceValues.filter((c) => c >= 50 && c < 80).length,
      lowConfidenceCount: confidenceValues.filter((c) => c < 50).length,
    };

    // Determine model status based on metrics
    let modelStatus: "healthy" | "degraded" | "critical" = "healthy";
    const alerts: { type: string; message: string; severity: "info" | "warning" | "critical" }[] = [];

    if (feedbackCount > 0) {
      if (accuracy < 50) {
        modelStatus = "critical";
        alerts.push({
          type: "accuracy",
          message: `Model accuracy is critically low at ${accuracy.toFixed(1)}%`,
          severity: "critical",
        });
      } else if (accuracy < 70) {
        modelStatus = "degraded";
        alerts.push({
          type: "accuracy",
          message: `Model accuracy has dropped to ${accuracy.toFixed(1)}%`,
          severity: "warning",
        });
      }
    }

    if (avgConfidence < 60) {
      alerts.push({
        type: "confidence",
        message: `Average confidence is low at ${avgConfidence.toFixed(1)}%`,
        severity: "warning",
      });
    }

    // Drift alerts
    if (driftMetrics.hasDrift) {
      if (modelStatus === "healthy") modelStatus = "degraded";
      alerts.push({
        type: "drift",
        message: `Model drift detected: ${driftMetrics.details.join("; ")}`,
        severity: driftMetrics.driftScore > 0.6 ? "critical" : "warning",
      });
    }

    const recentPredictions = analyses.filter((a) => {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      return new Date(a.created_at) > hourAgo;
    });

    if (recentPredictions.length > 0) {
      alerts.push({
        type: "activity",
        message: `${recentPredictions.length} prediction(s) in the last hour`,
        severity: "info",
      });
    }

    const lastPredictionAt = analyses.length > 0 ? analyses[0].created_at : null;

    const metrics: MLOpsMetrics = {
      totalPredictions,
      fraudDetected,
      safeDetected,
      avgConfidence: Math.round(avgConfidence * 10) / 10,
      feedbackCount,
      correctPredictions,
      incorrectPredictions,
      accuracy: Math.round(accuracy * 10) / 10,
      precision: Math.round(precision * 10) / 10,
      recall: Math.round(recall * 10) / 10,
      f1Score: Math.round(f1Score * 10) / 10,
      truePositives,
      falsePositives,
      trueNegatives,
      falseNegatives,
      modelVersion: "v1.0",
      modelStatus,
      lastPredictionAt,
      predictionsByDay,
      confidenceDistribution,
      topKeywords,
      confidenceStats,
      driftMetrics,
      alerts,
    };

    // Send email alerts for critical/warning issues
    if (sendAlerts && userEmail) {
      const criticalAlerts = alerts.filter((a) => a.severity === "critical");
      const warningAlerts = alerts.filter((a) => a.severity === "warning");

      for (const alert of criticalAlerts) {
        await sendEmailAlert(userEmail, "critical", alert.message, metrics);
      }

      // Only send first warning to avoid spam
      if (warningAlerts.length > 0 && criticalAlerts.length === 0) {
        await sendEmailAlert(userEmail, "warning", warningAlerts[0].message, metrics);
      }
    }

    console.log(`MLOps metrics calculated successfully. Status: ${modelStatus}, Drift: ${driftMetrics.hasDrift}`);

    return new Response(JSON.stringify(metrics), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("MLOps metrics error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to fetch metrics" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
