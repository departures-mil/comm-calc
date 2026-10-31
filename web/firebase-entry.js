// Firebase AI Logic (Gemini Developer API) köprüsü: window.CCFirebase.generate(config, model, parts)
import { initializeApp, getApps } from 'firebase/app';
import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';

let app = null, key = '';
window.CCFirebase = {
  async generate(config, model, parts) {
    const k = JSON.stringify(config);
    if (!app || k !== key) { app = initializeApp(config, 'cc-' + getApps().length); key = k; }
    const ai = getAI(app, { backend: new GoogleAIBackend() });
    const m = getGenerativeModel(ai, { model, generationConfig: { responseMimeType: 'application/json', temperature: 0.1 } });
    const r = await m.generateContent(parts);
    return r.response.text();
  }
};
