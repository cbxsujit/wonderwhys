import { GoogleGenAI, Modality } from "@google/genai";

const TEXT_MODEL = 'gemini-3-flash-preview';
const IMAGE_MODEL = 'gemini-2.5-flash-image';
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';

export async function* generateExplanationStream(question: string) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const responseStream = await ai.models.generateContentStream({
      model: TEXT_MODEL,
      contents: `You are Mrs. Wonder, a very kind Indian lady school teacher. 
                 Explain this to a 5-year-old child named Praggya: "${question}". 
                 Use exactly 3 very simple sentences. 
                 Start with "Namaste Praggya!" or "Hello Praggya!". 
                 Be extremely sweet, motherly, and use a comforting Indian tone. 
                 Do not use the words "beta" or "dear child", call her "Praggya" instead.`,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (err) {
    console.error("Text streaming failed:", err);
    throw new Error("Oh ho! Praggya, Mrs. Wonder's magic book is a bit slow today. Let's try again!");
  }
}

export async function generateIllustration(question: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const imageResponse = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: `A colorful 3D cartoon style illustration of ${question}. Cute, friendly, vibrant colors for a 5-year-old. Disney-Pixar inspired.`,
      config: {
        imageConfig: { aspectRatio: "1:1" }
      }
    });

    const candidate = imageResponse.candidates?.[0];
    const imagePart = candidate?.content?.parts?.find(p => p.inlineData);
    return imagePart?.inlineData ? `data:image/png;base64,${imagePart.inlineData.data}` : "";
  } catch (err) {
    console.warn("Image generation failed:", err);
    return "";
  }
}

export async function generateAudio(text: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    // Stripping emojis and markdown for cleaner TTS processing
    const cleanText = text
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}]/gu, '')
      .replace(/[*_#~`]/g, '')
      .trim();
    
    if (!cleanText) return "";

    const speechResponse = await ai.models.generateContent({
      model: TTS_MODEL,
      contents: [{ 
        parts: [{ 
          text: `Teacher (Indian Lady Accent): ${cleanText}` 
        }] 
      }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, 
          },
        },
      },
    });
    
    const audioPart = speechResponse.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    return audioPart?.inlineData?.data || "";
  } catch (err) {
    console.error("TTS error:", err);
    return "";
  }
}

export function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const numSamples = Math.floor(data.byteLength / 2);
  const alignedBuffer = new ArrayBuffer(numSamples * 2);
  new Uint8Array(alignedBuffer).set(data.subarray(0, numSamples * 2));
  
  const dataInt16 = new Int16Array(alignedBuffer);
  const frameCount = dataInt16.length / numChannels;
  
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}