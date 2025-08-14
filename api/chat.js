 import OpenAI from 'openai';

export default async function handler(req, res) {
  // Configurare CORS corectă
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Metoda nepermisă" });
  }

  // Verifică dacă cheia API este prezentă
  if (!process.env.OPENAI_API_KEY) {
    console.error('Lipsă OPENAI_API_KEY');
    return res.status(500).json({ 
      error: "Configurare server incompletă",
      success: false 
    });
  }

  try {
    const { prompt } = req.body;
    
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return res.status(400).json({ 
        error: "Te rog introdu un meci valid (ex: Steaua - Dinamo)",
        success: false 
      });
    }

    const openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30000 // 30s timeout
    });

    const systemPrompt = `Esti LucyOFM Bot, analist profesionist roman de fotbal...`; // Păstrează promptul original aici

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      max_tokens: 1200,
      temperature: 0.7
    });

    const reply = completion.choices[0]?.message?.content;
    
    if (!reply) {
      throw new Error('Niciun răspuns de la OpenAI');
    }

    return res.status(200).json({ 
      reply: reply,
      success: true
    });

  } catch (error) {
    console.error('Eroare API:', error);
    
    // Mesaje de eroare specifice
    let errorMessage = error.message;
    if (error instanceof OpenAI.APIError) {
      errorMessage = `Eroare OpenAI: ${error.code} - ${error.message}`;
    }
    
    return res.status(500).json({ 
      error: errorMessage,
      success: false
    });
  }
}
