import { OpenAI } from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// === REAL WEB SCRAPING FUNCTIONS ===

// Caută informații reale pe Google prin SERP API
async function searchRealData(query) {
  try {
    // Folosim ValueSERP API (gratuit 100 requests/lună)
    const apiKey = process.env.VALUESERP_KEY || 'demo';
    const searchUrl = `https://api.valueserp.com/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&location=Romania&gl=ro&hl=ro&num=10`;
    
    console.log(`🔍 Caut real: "${query}"`);
    
    const response = await fetch(searchUrl);
    if (!response.ok) {
      throw new Error(`Search API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    let results = [];
    if (data.organic_results) {
      results = data.organic_results.slice(0, 5).map(result => ({
        title: result.title,
        snippet: result.snippet,
        link: result.link,
        source: new URL(result.link).hostname
      }));
    }
    
    return results;
  } catch (error) {
    console.error('ValueSERP search failed:', error.message);
    return await fallbackSearch(query);
  }
}

// Backup cu căutare DirectAPI
async function fallbackSearch(query) {
  try {
    // Alternative: SerpAPI (100 searches gratuit/lună)
    const apiKey = process.env.SERPAPI_KEY || 'demo';
    const searchUrl = `https://serpapi.com/search?engine=google&q=${encodeURIComponent(query)}&location=Romania&gl=ro&hl=ro&api_key=${apiKey}`;
    
    const response = await fetch(searchUrl);
    const data = await response.json();
    
    if (data.organic_results) {
      return data.organic_results.slice(0, 5).map(result => ({
        title: result.title,
        snippet: result.snippet,
        link: result.link,
        source: new URL(result.link).hostname
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Fallback search failed:', error.message);
    return [];
  }
}

// Scraping direct de pe site-uri românești
async function scrapeRomanianFootball(homeTeam, awayTeam) {
  const results = [];
  
  try {
    console.log(`🕷️ Scraping real data pentru ${homeTeam} vs ${awayTeam}`);
    
    // Căutări specifice pe site-uri românești
    const searches = [
      `site:lpf.ro "${homeTeam}" "${awayTeam}" meci`,
      `site:sport.ro "${homeTeam}" vs "${awayTeam}" Liga 1`,
      `site:prosport.ro "${homeTeam}" "${awayTeam}" pronostic`,
      `site:digisport.ro "${homeTeam}" "${awayTeam}" ultimele stiri`,
      `site:gsp.ro "${homeTeam}" "${awayTeam}" analiza`,
      `"${homeTeam}" "${awayTeam}" cote pariuri 2025`,
      `"Liga 1" clasament 2024-2025 "${homeTeam}" pozitie`,
      `"Liga 1" clasament 2024-2025 "${awayTeam}" pozitie`,
      `"${homeTeam}" ultimele 5 meciuri rezultate`,
      `"${awayTeam}" ultimele 5 meciuri rezultate`,
      `"${homeTeam}" vs "${awayTeam}" head to head istoric`,
      `"${homeTeam}" lotul echipei accidentati suspendati 2025`
    ];
    
    // Execută căutările în paralel
    const searchPromises = searches.map(query => searchRealData(query));
    const searchResults = await Promise.all(searchPromises);
    
    // Compilează rezultatele
    searchResults.forEach((result, index) => {
      if (result && result.length > 0) {
        results.push({
          searchQuery: searches[index],
          results: result
        });
      }
    });
    
    return results;
    
  } catch (error) {
    console.error('Scraping error:', error.message);
    return [];
  }
}

// Extrage informații specifice din rezultatele căutării
function extractFootballData(searchResults) {
  let extractedData = {
    matchInfo: '',
    odds: '',
    standings: '',
    h2h: '',
    homeForm: '',
    awayForm: '',
    news: '',
    predictions: ''
  };
  
  searchResults.forEach(searchGroup => {
    const query = searchGroup.searchQuery.toLowerCase();
    const results = searchGroup.results;
    
    results.forEach(result => {
      const text = `${result.title} - ${result.snippet}`.toLowerCase();
      
      // Extrage cote dacă există
      if (query.includes('cote') || text.includes('cota')) {
        extractedData.odds += `• ${result.title}: ${result.snippet} (${result.source})\n`;
      }
      
      // Extrage clasament
      if (query.includes('clasament') || text.includes('clasament')) {
        extractedData.standings += `• ${result.title}: ${result.snippet} (${result.source})\n`;
      }
      
      // Extrage H2H
      if (query.includes('head to head') || query.includes('vs') && query.includes('meci')) {
        extractedData.h2h += `• ${result.title}: ${result.snippet} (${result.source})\n`;
      }
      
      // Extrage forma echipelor
      if (query.includes('ultimele') && query.includes('meciuri')) {
        if (query.includes(extractedData.homeTeam)) {
          extractedData.homeForm += `• ${result.snippet} (${result.source})\n`;
        } else {
          extractedData.awayForm += `• ${result.snippet} (${result.source})\n`;
        }
      }
      
      // Extrage știri și analize
      if (query.includes('analiza') || query.includes('pronostic') || query.includes('stiri')) {
        extractedData.predictions += `• ${result.title}: ${result.snippet} (${result.source})\n`;
      }
      
      // Info general meci
      if (query.includes('lpf.ro') || query.includes('sport.ro')) {
        extractedData.matchInfo += `• ${result.title}: ${result.snippet} (${result.source})\n`;
      }
    });
  });
  
  return extractedData;
}

// === SYSTEM PROMPT ===
const systemPrompt = `
Ești **LucyOFM Bot**, analist profesionist român cu acces la DATE REALE de pe internet.

Primești rezultate REALE căutate live de pe site-uri românești: LPF.ro, Sport.ro, ProSport.ro, DigiSport.ro, GSP.ro.

IMPORTANT: 
- Folosește DOAR informațiile reale găsite în căutări
- Dacă nu există informații pentru un punct, scrie "Date real indisponibile"
- Citează SURSA pentru fiecare informație: (Sport.ro), (LPF.ro), etc.
- Nu inventa NIMIC! Doar date reale!

Returnează exact 10 puncte:

✅ **1. Informații Meci** - din LPF.ro, Sport.ro
📊 **2. Cote Live** - din rezultatele de căutare reale
📈 **3. H2H Real** - din rezultatele găsite
📊 **4. Forma Gazde** - din știrile reale
📊 **5. Forma Oaspeți** - din știrile reale  
🏆 **6. Clasament Real** - din LPF.ro sau Sport.ro
⚽ **7. Statistici** - din analizele găsite
📋 **8. Știri și Lot** - din DigiSport, ProSport
🎯 **9. Analize Experți** - din pronosticurile găsite
🎯 **10. Concluzie** - bazată pe datele reale de mai sus

Dacă pentru un punct nu ai date reale, scrie exact: "⚠️ Date real indisponibile pentru acest aspect"
`;

// === MAIN HANDLER ===
export default async function handler(req, res) {
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
    console.log('🚀 Încep analiza REALĂ pentru:', prompt);
    
    // Parse echipele
    const matchParsed = prompt
      .replace(/\s*(vs?|versus|-|–)\s*/gi, '|')
      .split('|')
      .map(team => team.trim())
      .filter(team => team.length > 0);

    if (matchParsed.length < 2) {
      return res.status(400).json({ 
        error: "Format invalid. Folosește: 'Echipa1 - Echipa2'" 
      });
    }

    const [homeTeam, awayTeam] = matchParsed;
    console.log(`🏟️ Analizez REAL: ${homeTeam} vs ${awayTeam}`);

    // Caută date REALE pe internet
    console.log('🔍 Încep căutarea de date reale...');
    const realSearchResults = await scrapeRomanianFootball(homeTeam, awayTeam);
    
    if (realSearchResults.length === 0) {
      return res.status(500).json({ 
        error: "Nu am putut accesa datele reale. Verifică conectivitatea sau cheile API." 
      });
    }
    
    // Extrage datele utile
    const extractedData = extractFootballData(realSearchResults);
    extractedData.homeTeam = homeTeam;
    extractedData.awayTeam = awayTeam;
    
    // Formatează pentru GPT
    const realDataText = `
=== ANALIZĂ REALĂ ${homeTeam.toUpperCase()} vs ${awayTeam.toUpperCase()} ===

INFORMAȚII MECI GĂSITE:
${extractedData.matchInfo || 'Nu s-au găsit informații oficiale'}

COTE GĂSITE:
${extractedData.odds || 'Nu s-au găsit cote live'}

CLASAMENT GĂSIT:
${extractedData.standings || 'Nu s-au găsit date de clasament'}

H2H GĂSIT:
${extractedData.h2h || 'Nu s-au găsit date H2H'}

FORMA GAZDE GĂSITĂ:
${extractedData.homeForm || 'Nu s-au găsit date despre forma gazdelor'}

FORMA OASPEȚI GĂSITĂ:
${extractedData.awayForm || 'Nu s-au găsit date despre forma oaspeților'}

ANALIZE ȘI PREDICȚII GĂSITE:
${extractedData.predictions || 'Nu s-au găsit analize de la experți'}

=== TOATE REZULTATELE CĂUTĂRII ===
${JSON.stringify(realSearchResults, null, 2)}
    `;

    console.log('📊 Trimit datele reale la GPT pentru analiză...');

    // Analizează cu GPT-4 bazat pe date REALE
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: realDataText },
      ],
      max_tokens: 1500,
      temperature: 0.1, // Foarte factual
    });
    
    console.log('✅ Analiza REALĂ completată');
    res.status(200).json({ reply: completion.choices[0].message.content });
    
  } catch (err) {
    console.error("❌ Eroare:", err.message);
    
    // Fallback cu mesaj clar
    res.status(500).json({ 
      error: `Pentru analize cu date 100% reale, bot-ul necesită chei API pentru căutare web. 
             Momentan funcționează cu analize inteligente dar nu live.
             Pentru date reale, configurează: VALUESERP_KEY sau SERPAPI_KEY în Vercel.`,
      technicalError: err.message
    });
  }
}
