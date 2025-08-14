 import OpenAI from 'openai';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: "Metodă nepermisă" });

  try {
    const { prompt } = req.body;
    if (!prompt || prompt.trim() === '') {
      return res.status(400).json({ error: "Introdu un meci valid", success: false });
    }

    // Verifică existența cheii
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("Lipsă cheie OpenAI în variabilele de mediu");
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Prompt-ul tău original aici (fără modificări)
    const systemPrompt = `Esti LucyOFM Bot, analist profesionist roman de fotbal...`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      max_tokens: 1000
    });

    const reply = completion.choices[0]?.message?.content;
    return res.status(200).json({ reply, success: true });

  } catch (error) {
    console.error('Eroare gravă:', error);
    return res.status(500).json({ 
      error: `EROARE: ${error.message}`,
      success: false
    });
  }
}
