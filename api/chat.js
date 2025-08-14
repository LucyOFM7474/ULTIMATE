 export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt } = req.body;
    
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return res.status(400).json({ 
        error: "Te rog introdu un meci valid",
        success: false 
      });
    }

    const { OpenAI } = await import('openai');
    const openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY 
    });

    const systemPrompt = `Esti LucyOFM Bot, analist profesionist roman de fotbal. 

Analizeaza meciul cerut si returneaza EXACT 10 puncte numerotate cu simboluri:

✅ consens surse
⚠️ atentie  
📊 statistica cheie
🎯 pariu recomandat

Structura obligatorie:
1. Cote & predictii externe (SportyTrader, Forebet, etc.)
2. H2H ultimele 5 meciuri directe
3. Forma gazdelor (meciuri acasa)
4. Forma oaspetilor (meciuri deplasare) 
5. Clasament actual & motivatie
6. GG & BTTS procente recente
7. Cornere, posesie, cartonase - medii
8. Jucatori importanti & absente
9. Predictie scor exact
10. Recomandari pariuri finale

Foloseste emoji-uri si fii concis dar detaliat.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      max_tokens: 1000,
      temperature: 0.7
    });

    const reply = completion.choices[0]?.message?.content;
    
    if (!reply) {
      throw new Error('No reply from OpenAI');
    }

    console.log('Success - reply received for:', prompt);
    
    return res.status(200).json({ 
      reply: reply,
      success: true
    });

  } catch (error) {
    console.error('Handler error:', error);
    
    return res.status(500).json({ 
      error: error.message,
      success: false
    });
  }
}
