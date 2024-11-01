import { GoogleGenerativeAI } from "@google/generative-ai";

const ai = new GoogleGenerativeAI(process.env.API_KEY);
const model = ai.getGenerativeModel({ 
    model: 'gemini-1.5-flash',
    generationConfig: {
        maxOutputTokens: 2000
    }
});

export const summarize = async (text) => {
    return model.generateContent(text);
};