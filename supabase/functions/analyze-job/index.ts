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

// Call Google Gemini API
async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 429) throw new Error("RATE_LIMIT");
    if (response.status === 403) throw new Error("INVALID_KEY");
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, content, fileType, jobData, fileName, mimeType } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured in Supabase secrets.");
    }

    let prompt = "";
    const actualFileType = type === "file" ? getFileCategory(mimeType || "", fileName) : "manual";

    console.log(`Processing ${type} request, file category: ${actualFileType}`);

    const baseAnalysisPrompt = `You are an advanced job fraud detection AI trained on the Employment Scam Aegean Dataset (EMSCAD).

Your task is to analyze job postings and determine fraud probability with high confidence.

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

LEGITIMATE INDICATORS (High Weight):
- Clear company identity with verifiable information
- Specific job requirements and qualifications
- Standard interview process mentioned
- Professional email domain
- Detailed job responsibilities
- Reasonable salary range for the role
- Physical office location (if not remote)
- Standard benefits package mentioned

Respond with ONLY a valid JSON object in this exact format (no markdown, no extra text):
{
  "isFake": boolean,
  "confidence": number,
  "extractedData": {
    "title": "extracted job title or null",
    "company": "extracted company name or null",
    "location": "extracted location or null",
    "salary": "extracted salary or null",
    "description": "brief summary of job description (max 200 chars)"
  },
  "factors": ["array of 3-6 specific findings that led to your conclusion"]
}`;

    if (type === "file") {
      if (actualFileType === "spreadsheet") {
        const base64Data = content.split(",")[1] || content;
        let textContent = "";
        try { textContent = atob(base64Data); } catch { textContent = content; }
        prompt = `${baseAnalysisPrompt}\n\nSPREADSHEET/CSV CONTENT:\n${textContent.substring(0, 15000)}\n\nAnalyze ALL entries. Identify which look suspicious and provide an overall assessment.`;
      } else {
        const base64Data = content.split(",")[1] || content;
        let textContent = "";
        try {
          textContent = atob(base64Data);
          textContent = textContent.replace(/[^\x20-\x7E\n\r\t]/g, " ").trim();
        } catch { textContent = content; }
        prompt = `${baseAnalysisPrompt}\n\nDOCUMENT CONTENT:\n${textContent.substring(0, 15000)}`;
      }
    } else {
      // Manual form submission
      prompt = `${baseAnalysisPrompt}

Analyze this job posting for potential fraud:

Job Details:
- Title: ${jobData.title}
- Company: ${jobData.company}
- Location: ${jobData.location || "Not specified"}
- Salary: ${jobData.salary || "Not specified"}
- Description: ${jobData.description}
- Requirements: ${jobData.requirements || "Not specified"}`;
    }

    console.log("Sending request to Gemini API...");
    const aiResponse = await callGemini(GEMINI_API_KEY, prompt);
    console.log("Gemini response received, length:", aiResponse?.length);

    // Parse the JSON response
    let result;
    try {
      const jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, aiResponse];
      const jsonString = (jsonMatch[1] || aiResponse).trim();
      result = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", parseError);
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

    result.confidence = Math.max(60, Math.min(98, result.confidence || 75));
    console.log(`Analysis complete: isFake=${result.isFake}, confidence=${result.confidence}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Analyze job error:", error);

    if (error instanceof Error) {
      if (error.message === "RATE_LIMIT") {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (error.message === "INVALID_KEY") {
        return new Response(
          JSON.stringify({ error: "Invalid Gemini API key. Please check your configuration." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Analysis failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
