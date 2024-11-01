import { GoogleGenerativeAI } from "@google/generative-ai";

const ai = new GoogleGenerativeAI(process.env.API_KEY);
const model = ai.getGenerativeModel({ 
    model: 'gemini-1.5-flash',
    systemInstruction: 'You must answer in no more than 300 words.',
    generationConfig: {
        maxOutputTokens: 1000
    }
});

export const summarize = async (text) => {
    throw new Error('test');
    return model.generateContent(`Summarize the following website: ${text}`);
};