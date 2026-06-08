import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function list() {
  try {
    const models = await ai.models.list();
    for await (const m of models) {
        console.log(m.name);
    }
  } catch (e) {
    console.error(e);
  }
}
list();
