import { GoogleGenAI, Modality } from "@google/genai";
import { VoiceName } from "../types";

const apiKey = process.env.API_KEY;
// Using a singleton-like pattern for the client, but re-instantiating if needed is fine.
// We'll create a new instance per request to be safe with key changes if they were dynamic, 
// but here they are static env vars.
const ai = new GoogleGenAI({ apiKey: apiKey });

/**
 * Step 1: Summarize the raw text into a broadcast script.
 */
export const generateBroadcastScript = async (rawText: string): Promise<{ title: string; script: string }> => {
  try {
    const model = "gemini-2.5-flash";
    
    const prompt = `
      You are an expert news anchor and editor. 
      Your task is to take the following raw news text and turn it into a concise, engaging audio briefing script suitable for a morning commute.
      
      Guidelines:
      - Create a catchy headline/title for this briefing.
      - Write the script as if it is being spoken by a friendly, professional host.
      - Keep it under 200 words if possible, focusing on the key facts.
      - Use natural transitions between topics if there are multiple.
      - Avoid "Here is the summary" type intros. Just start the briefing.
      - Return the output in JSON format with keys: "title" and "script".

      Raw Text:
      "${rawText}"
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
    if (!text) throw new Error("No text returned from summarization model.");

    const json = JSON.parse(text);
    return {
      title: json.title || "Daily Briefing",
      script: json.script || text // Fallback if script key is missing
    };

  } catch (error) {
    console.error("Error generating script:", error);
    throw error;
  }
};

/**
 * Step 2: Convert the script to audio using the TTS model.
 */
export const generateSpeechFromText = async (
  text: string, 
  voiceName: VoiceName = VoiceName.Puck
): Promise<string> => {
  try {
    const model = "gemini-2.5-flash-preview-tts";

    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (!base64Audio) {
      throw new Error("No audio data returned from Gemini.");
    }

    return base64Audio;
  } catch (error) {
    console.error("Error generating speech:", error);
    throw error;
  }
};