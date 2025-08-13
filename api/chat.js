import { OpenAI } from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const systemPrompt = `
Ești **LucyOFM Bot**, analist profesionist român pentru fotbal.  
Returnează **10 puncte clare și numerotate**, cu simboluri:

✅ consens surse  
⚠️ atenție  
📊 statistică cheie  
🎯 pariu recomandat  

Structura OBLIGATORIE:
1. Cote & predicții externe live (SportyTrader, PredictZ, WinDrawWin, Forebet, SportsGambler)
2. H2H ultimele 5 directe
3. Forma gazdelor (acasă)
4. Forma oaspeților (deplasare)
5. Clasament & motivație
6. GG & BTTS – procente recente
7. Cornere, posesie, galbene – medii
8. Jucători-cheie / absențe / lot actual
9. Predicție scor exact
10. Recomandări pariuri (✅ solist, 💰 valoare, 🎯 surpriză, ⚽ goluri, 🚩 cornere)

Folosește culori și emoji-uri. Fii detaliat și profesionist.
`;

export default async function handler(req, res) {
  // Adaugă headers pentru CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metoda nu este permisă" });
  }

  const { prompt } = req.body;
  if (!prompt?.trim()) {
    return res.status(400).json({ error: "Introdu un meci valid" });
  }

  try {
    console.log('Procesez meciul:', prompt);
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Analizează meciul: ${prompt}` },
      ],
      max_tokens: 1200,
      temperature: 0.7,
    });
    
    console.log('OpenAI response received');
    res.status(200).json({ reply: completion.choices[0].message.content });
    
  } catch (err) {
    console.error("Eroare OpenAI:", err.message);
    
    if (err.message.includes('API key')) {
      return res.status(500).json({ error: "Cheie OpenAI invalidă. Verifică setările." });
    }
    
    res.status(500).json({ error: "Eroare la procesarea cererii: " + err.message });
  }
}
