// Supabase Edge Function: ai-quick-add
// Location: supabase/functions/ai-quick-add/index.ts
// Serves requests to analyze Chinese vocabulary using Google's Gemini 1.5 Flash (Free Tier).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { word } = await req.json();

    if (!word || typeof word !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing 'word' parameter" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      return new Response(
        JSON.stringify({
          error: "GEMINI_API_KEY is not set on Supabase Secrets.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const systemPrompt = `You are a helpful Chinese-Vietnamese lexicographer. Analyze the Chinese word provided and return structured details strictly in JSON format.
JSON Schema:
{
  "simplified": "string (the input simplified Chinese characters)",
  "traditional": "string (traditional Chinese equivalent if different, otherwise same)",
  "pinyin": "string (Pinyin with tone marks, syllables separated by spaces, e.g., 'xué xí')",
  "han_viet": "string (Sino-Vietnamese translation, lowercase, e.g., 'học tập')",
  "definition_vi": "string (natural Vietnamese translation and definitions)",
  "example_zh": "string (a short, natural example sentence in simplified Chinese)",
  "example_pinyin": "string (Pinyin with tone marks for the example sentence)",
  "example_vi": "string (Vietnamese translation of the example sentence)",
  "radicals": [
    {
      "character": "string (the radical character, e.g. '氵' or '子')",
      "pinyin": "string (pinyin of radical)",
      "vietnamese_name": "string (Vietnamese name of radical, e.g. 'Ba chấm thủy' or 'Tử')",
      "stroke_count": number (number of strokes in the radical)
    }
  ]
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: `Analyze the word: "${word}"` }],
            },
          ],
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        }),
      },
    );

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || "Gemini API error");
    }

    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) {
      throw new Error("No response content from Gemini API");
    }

    const wordDetails = JSON.parse(resultText);

    return new Response(JSON.stringify(wordDetails), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Internal Server Error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
