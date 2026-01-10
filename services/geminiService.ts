import { GoogleGenAI, Type } from "@google/genai";
import { GeminiAnalysis } from "../types";

// Safe access to process.env for various deployment environments (Vite, Webpack, Capacitor, Browser)
const getApiKey = () => {
  try {
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      return process.env.API_KEY;
    }
  } catch (e) {
    // Ignore ReferenceError if process is not defined
  }
  return '';
};

const apiKey = getApiKey();
// Initialize safe client
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const isAiAvailable = () => !!ai;

const ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING, description: "A brief, 1-sentence summary of what this content is." },
    safetyRating: { type: Type.STRING, description: "One of: 'safe', 'caution', 'unknown'. Based on heuristics (e.g., suspicious URLs)." },
    category: { type: Type.STRING, description: "Category like 'Website', 'WiFi Config', 'Product ID', 'Plain Text', etc." },
    actions: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "List of 1-2 recommended actions (e.g., 'Open in Browser', 'Copy Password', 'Search Product')."
    }
  },
  required: ["summary", "safetyRating", "category", "actions"]
};

export const analyzeContent = async (content: string): Promise<GeminiAnalysis | null> => {
  if (!ai) {
    console.warn("Gemini API key not found. Please ensure process.env.API_KEY is set in your build environment.");
    return null;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze this QR code content: "${content}". Provide a safety assessment, a category, a very brief summary, and suggested user actions.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: ANALYSIS_SCHEMA,
      },
    });

    const text = response.text;
    if (!text) return null;
    
    return JSON.parse(text) as GeminiAnalysis;
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return null;
  }
};