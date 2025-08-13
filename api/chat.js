import { OpenAI } from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const systemPrompt = `
Ești **LucyOFM Bot**, analist profesionist român.  
Returnează **10 puncte clare și numerotate**, cu simboluri:

✅ consens surse  
⚠️ atenție  
📊 statistică cheie  
🎯 pariu recomandat  

Structura fixă:
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

Folosește emoji-uri și text clar, bazat pe date statistice. Evită speculații inutile.
`;

export default async function handler(req, res) {
  console.log("Request received:", req.method, req.url);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS request");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    console.log("Method not allowed:", req.method);
    return res.status(405).json({ error: "Doar POST permis" });
  }

  let body;
  try {
    body = await new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => data += chunk);
      req.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(err);
        }
      });
      req.on('error', reject);
    });
  } catch (err) {
    console.log("Invalid JSON body:", err.message);
    return res.status(400).json({ error: "Body JSON invalid" });
  }

  const { prompt } = body;
  if (!prompt?.trim()) {
    console.log("No prompt provided");
    return res.status(400).json({ error: "Introdu un meci valid (ex. Rapid - FCSB)" });
  }

  try {
    console.log("Sending request to OpenAI for prompt:", prompt);
    const completion = await openai.chat.completions.create({
      model: process.env.MODEL || "gpt-5",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      max_completion_tokens: 900, // Înlocuit max_tokens cu max_completion_tokens
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content || "Fără răspuns valid";
    console.log("OpenAI response received");
    res.status(200).json({ reply });
  } catch (err) {
    console.error("Eroare OpenAI:", err.message);
    res.status(500).json({ error: "Eroare la procesarea cererii: " + err.message });
  }
}
