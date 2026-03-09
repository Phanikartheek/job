import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Determine file type from MIME or extension
function getFileCategory(mimeType: string, fileName?: string): "image" | "video" | "pdf" | "spreadsheet" | "document" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType === "application/pdf") return "pdf";
  if (
    mimeType.includes("csv") ||
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    fileName?.endsWith(".csv") ||
    fileName?.endsWith(".xlsx") ||
    fileName?.endsWith(".xls")
  ) {
    return "spreadsheet";
  }
  return "document";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, content, fileType, jobData, fileName, mimeType } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");

    if (!OPENAI_API_KEY) {
      throw new Error("API key is not configured. Please set OPENAI_API_KEY in Supabase secrets.");
    }

    let prompt = "";
    let messages: any[] = [];

    // Determine actual file category
    const actualFileType = type === "file" ? getFileCategory(mimeType || "", fileName) : "manual";

    console.log(`Processing ${type} request, file category: ${actualFileType}`);

    if (type === "file") {
      const baseAnalysisPrompt = `You are an advanced job fraud detection AI trained on the Employment Scam Aegean Dataset (EMSCAD). 
      
Your task is to analyze content from job postings and determine fraud probability with high confidence.

CRITICAL FRAUD INDICATORS (High Weight):
- Requests for payment, fees, or "investment" to start working
- Asking for bank account, SSN, or credit card information upfront
- Unusually high salary for minimal qualifications
- Vague or missing company information
- Pressure tactics and artificial urgency ("Apply within 24 hours!")
- Unsolicited job offers via email/text
- Work-from-home with unrealistic income promises
- No interview process or immediate hiring
- Generic job descriptions without specific duties
- Suspicious contact methods (personal email, WhatsApp only)
- Grammar/spelling errors in official communications
- Requests to forward packages or process payments

LEGITIMATE INDICATORS (High Weight):
- Clear company identity with verifiable information
- Specific job requirements and qualifications
- Standard interview process mentioned
- Professional email domain
- Detailed job responsibilities
- Reasonable salary range for the role
- Physical office location (if not remote)
- Standard benefits package mentioned

Respond with a JSON object in this exact format:
{
  "isFake": boolean,
  "confidence": number (60-98, be confident in your assessment),
  "extractedData": {
    "title": "extracted job title or null",
    "company": "extracted company name or null",
    "location": "extracted location or null",
    "salary": "extracted salary or null",
    "description": "brief summary of job description (max 200 chars)"
  },
  "factors": ["array of 3-6 specific findings that led to your conclusion"]
}`;

      if (actualFileType === "image") {
        messages = [
          { role: "system", content: baseAnalysisPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this job posting image for potential fraud. Extract all visible information and assess legitimacy:" },
              { type: "image_url", image_url: { url: content } }
            ]
          }
        ];
      } else if (actualFileType === "video") {
        // For video, we analyze the first frame or provide general guidance
        messages = [
          { role: "system", content: baseAnalysisPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "The user uploaded a video file. Since I cannot directly analyze video content, please provide guidance on what to look for in job posting videos. If this appears to be a screenshot or still frame, analyze it for potential fraud:" },
              { type: "image_url", image_url: { url: content } }
            ]
          }
        ];
      } else if (actualFileType === "spreadsheet") {
        // CSV/Excel content - typically bulk job listings
        const base64Data = content.split(",")[1] || content;
        let textContent = "";

        try {
          textContent = atob(base64Data);
        } catch {
          textContent = content;
        }

        prompt = `${baseAnalysisPrompt}

This is spreadsheet/CSV data that may contain job listings. Analyze ALL entries and provide an overall assessment.

SPREADSHEET CONTENT:
${textContent.substring(0, 15000)}

If multiple jobs are listed, focus on common patterns. Identify which entries look suspicious.`;

        messages = [
          { role: "system", content: "You are a job fraud detection AI that analyzes bulk job data and responds only with valid JSON." },
          { role: "user", content: prompt }
        ];
      } else {
        // PDF, DOC, TXT - text documents
        const base64Data = content.split(",")[1] || content;
        let textContent = "";

        try {
          textContent = atob(base64Data);
          // Clean up binary artifacts from PDFs
          textContent = textContent.replace(/[^\x20-\x7E\n\r\t]/g, " ").trim();
        } catch {
          textContent = content;
        }

        prompt = `${baseAnalysisPrompt}

DOCUMENT CONTENT:
${textContent.substring(0, 15000)}`;

        messages = [
          { role: "system", content: "You are a job fraud detection AI that responds only with valid JSON." },
          { role: "user", content: prompt }
        ];
      }
    } else {
      // Manual form submission
      prompt = `You are an advanced job fraud detection AI trained on the Employment Scam Aegean Dataset (EMSCAD).

Analyze this job posting for potential fraud:

Job Details:
- Title: ${jobData.title}
- Company: ${jobData.company}
- Location: ${jobData.location || "Not specified"}
- Salary: ${jobData.salary || "Not specified"}
- Description: ${jobData.description}
- Requirements: ${jobData.requirements || "Not specified"}

CRITICAL FRAUD INDICATORS:
- Requests for payment or personal financial information
- Unrealistic salary promises
- Vague company information
- Urgency tactics
- No interview process
- Work from home with unusually high pay
- Suspicious contact methods

Respond with a JSON object in this exact format:
{
  "isFake": boolean,
  "confidence": number (60-98),
  "factors": ["array of 3-6 specific issues or positive signals found"]
}`;

      messages = [
        { role: "system", content: "You are a job fraud detection AI that responds only with valid JSON." },
        { role: "user", content: prompt }
      ];
    }

    console.log("Sending request to AI gateway...");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    console.log("AI response received, length:", aiResponse?.length);

    // Parse the JSON response from AI
    let result;
    try {
      // Extract JSON from the response (handle markdown code blocks)
      const jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, aiResponse];
      const jsonString = jsonMatch[1] || aiResponse;
      result = JSON.parse(jsonString.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Fallback response
      result = {
        isFake: false,
        confidence: 70,
        factors: ["Analysis completed but response format was unexpected. Manual review recommended."],
        extractedData: type === "file" ? {
          title: null,
          company: null,
          location: null,
          salary: null,
          description: "Unable to extract details. Please try manual entry."
        } : undefined
      };
    }

    // Ensure confidence is within valid range
    result.confidence = Math.max(60, Math.min(98, result.confidence || 75));

    console.log(`Analysis complete: isFake=${result.isFake}, confidence=${result.confidence}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Analyze job error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Analysis failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
