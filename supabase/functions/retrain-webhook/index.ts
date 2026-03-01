import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RetrainingRequest {
  action: "check" | "trigger" | "status";
  reason?: string;
  modelVersion?: string;
}

interface RetrainingResponse {
  success: boolean;
  message: string;
  status?: "idle" | "pending" | "in_progress" | "completed" | "failed";
  lastRetrained?: string;
  nextScheduled?: string;
  metrics?: {
    totalSamples: number;
    fraudSamples: number;
    safeSamples: number;
    feedbackCount: number;
    currentAccuracy: number;
  };
  recommendation?: {
    shouldRetrain: boolean;
    reasons: string[];
    priority: "low" | "medium" | "high" | "critical";
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Retrain webhook called");

    // Parse request body
    let requestBody: RetrainingRequest = { action: "check" };
    try {
      requestBody = await req.json();
    } catch {
      // Default to check action
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch all data for analysis
    const [analysesResult, feedbackResult] = await Promise.all([
      supabase.from("job_analyses").select("*").order("created_at", { ascending: false }),
      supabase.from("prediction_feedback").select("*"),
    ]);

    if (analysesResult.error) throw analysesResult.error;
    if (feedbackResult.error) throw feedbackResult.error;

    const analyses = analysesResult.data || [];
    const feedback = feedbackResult.data || [];

    // Calculate metrics
    const totalSamples = analyses.length;
    const fraudSamples = analyses.filter((a) => a.is_fraud).length;
    const safeSamples = totalSamples - fraudSamples;
    const feedbackCount = feedback.filter((f) => f.feedback_type).length;
    const correctFeedback = feedback.filter((f) => f.feedback_type === "correct").length;
    const currentAccuracy = feedbackCount > 0 ? (correctFeedback / feedbackCount) * 100 : 0;

    // Analyze retraining need
    const shouldRetrainReasons: string[] = [];
    let priority: "low" | "medium" | "high" | "critical" = "low";

    // Check accuracy drop
    if (feedbackCount >= 10 && currentAccuracy < 70) {
      shouldRetrainReasons.push(`Accuracy dropped to ${currentAccuracy.toFixed(1)}%`);
      priority = currentAccuracy < 50 ? "critical" : "high";
    }

    // Check for significant new data
    const recentAnalyses = analyses.filter((a) => {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return new Date(a.created_at) > weekAgo;
    });

    if (recentAnalyses.length >= 50) {
      shouldRetrainReasons.push(`${recentAnalyses.length} new predictions in last 7 days`);
      if (priority === "low") priority = "medium";
    }

    // Check for data drift
    const last7Days = analyses.filter((a) => {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return new Date(a.created_at) > weekAgo;
    });

    const previous7Days = analyses.filter((a) => {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const date = new Date(a.created_at);
      return date >= twoWeeksAgo && date < weekAgo;
    });

    if (last7Days.length >= 10 && previous7Days.length >= 10) {
      const currentFraudRate = (last7Days.filter((a) => a.is_fraud).length / last7Days.length) * 100;
      const previousFraudRate = (previous7Days.filter((a) => a.is_fraud).length / previous7Days.length) * 100;
      const rateChange = Math.abs(currentFraudRate - previousFraudRate);

      if (rateChange > 20) {
        shouldRetrainReasons.push(`Fraud rate shifted by ${rateChange.toFixed(1)}%`);
        if (priority === "low") priority = "medium";
      }
    }

    // Check for high incorrect feedback rate
    const incorrectFeedback = feedback.filter((f) => f.feedback_type === "incorrect").length;
    if (feedbackCount >= 5 && incorrectFeedback / feedbackCount > 0.3) {
      shouldRetrainReasons.push(`${((incorrectFeedback / feedbackCount) * 100).toFixed(1)}% incorrect predictions reported`);
      if (priority === "low" || priority === "medium") priority = "high";
    }

    const shouldRetrain = shouldRetrainReasons.length > 0;

    // Build response based on action
    let response: RetrainingResponse;

    switch (requestBody.action) {
      case "trigger":
        // In a real system, this would trigger the actual retraining pipeline
        console.log("Retraining triggered:", requestBody.reason || "Manual trigger");
        
        // Log the retraining event (you could store this in a table)
        response = {
          success: true,
          message: "Retraining job queued successfully",
          status: "pending",
          lastRetrained: new Date().toISOString(),
          metrics: {
            totalSamples,
            fraudSamples,
            safeSamples,
            feedbackCount,
            currentAccuracy: Math.round(currentAccuracy * 10) / 10,
          },
          recommendation: {
            shouldRetrain,
            reasons: shouldRetrainReasons,
            priority,
          },
        };

        // Send email notification about retraining (if Resend is configured)
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        if (resendApiKey) {
          try {
            const { Resend } = await import("https://esm.sh/resend@2.0.0");
            const resend = new Resend(resendApiKey);
            
            await resend.emails.send({
              from: "JobGuard MLOps <onboarding@resend.dev>",
              to: ["admin@example.com"], // In production, fetch from settings
              subject: "🔄 Model Retraining Triggered",
              html: `
                <h1>Model Retraining Initiated</h1>
                <p><strong>Reason:</strong> ${requestBody.reason || "Manual trigger"}</p>
                <p><strong>Priority:</strong> ${priority}</p>
                <p><strong>Current Accuracy:</strong> ${currentAccuracy.toFixed(1)}%</p>
                <p><strong>Training Samples:</strong> ${totalSamples}</p>
                <h3>Retraining Reasons:</h3>
                <ul>
                  ${shouldRetrainReasons.map((r) => `<li>${r}</li>`).join("")}
                </ul>
              `,
            });
          } catch (emailError) {
            console.error("Failed to send retraining notification:", emailError);
          }
        }
        break;

      case "status":
        response = {
          success: true,
          message: "Retraining status retrieved",
          status: "idle", // In production, fetch from a jobs table
          lastRetrained: "2026-01-01T00:00:00Z", // Would come from DB
          nextScheduled: "2026-01-15T00:00:00Z", // Based on schedule
          metrics: {
            totalSamples,
            fraudSamples,
            safeSamples,
            feedbackCount,
            currentAccuracy: Math.round(currentAccuracy * 10) / 10,
          },
        };
        break;

      case "check":
      default:
        response = {
          success: true,
          message: shouldRetrain 
            ? `Retraining recommended (${priority} priority)` 
            : "Model performance is acceptable",
          status: "idle",
          metrics: {
            totalSamples,
            fraudSamples,
            safeSamples,
            feedbackCount,
            currentAccuracy: Math.round(currentAccuracy * 10) / 10,
          },
          recommendation: {
            shouldRetrain,
            reasons: shouldRetrainReasons,
            priority,
          },
        };
    }

    console.log("Retrain webhook response:", response.message);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Retrain webhook error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : "Failed to process request",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
