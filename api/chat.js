import { OpenAI } from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// === API CONFIGURATIONS ===
const APIS = {
  football: {
    url: 'https://api-football-v1.p.rapidapi.com/v3/',
    headers: {
      'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || 'demo',
      'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
    }
  },
  sportsdb: {
    url: 'https://www.thesportsdb.com/api/v1/json/3/',
    headers: {}
  },
  footballdata: {
    url: 'https://api.football-data.org/v4/',
    headers: {
      'X-Auth-Token': process.env.FOOTBALL_DATA_KEY || 'demo'
    }
  }
};

// === HELPER FUNCTIONS ===
async function makeAPICall(apiName, endpoint, params = {}) {
  try {
    const api = APIS[apiName];
    const queryString = new URLSearchParams(params).toString();
    const url = `${api.url}${endpoint}${queryString ? '?' + queryString : ''}`;
    
    console.log(`🔍 API Call: ${apiName} - ${endpoint}`);
    
    const response = await fetch(url, { headers: api.headers });
    if (!response.ok) {
      throw new Error(`API ${apiName} error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`❌ ${apiName} API error:`, error.message);
    return null;
  }
}

// Găsește echipele și meciul
async function findTeamAndFixture(homeTeam, awayTeam) {
  console.log(`🔍 Caut: ${homeTeam} vs ${awayTeam}`);
  
  // 1. Caută în API-Football (Liga 1 Romania = league 283)
  const fixtures = await makeAPICall('football', 'fixtures', {
    league: '283', // Liga 1 Romania
    season: '2024',
    status: 'NS-1H-HT-2H-ET-P-FT' // Toate statusurile
  });

  if (fixtures?.response) {
    const match = fixtures.response.find(fixture => {
      const home = fixture.teams.home.name.toLowerCase();
      const away = fixture.teams.away.name.toLowerCase();
      return (
        (home.includes(homeTeam.toLowerCase()) || homeTeam.toLowerCase().includes(home)) &&
        (away.includes(awayTeam.toLowerCase()) || awayTeam.toLowerCase().includes(away))
      );
    });
    
    if (match) {
      console.log('✅ Meci găsit în API-Football');
      return { fixture: match, source: 'api-football' };
    }
  }

  // 2. Backup cu TheSportsDB
  const sportsDbSearch = await makeAPICall('sportsdb', `searchteams.php`, {
    t: homeTeam
  });
  
  return { fixture: null, source: 'fallback', searchResult: sportsDbSearch };
}

// Obține statistici H2H
async function getH2HStats(team1Id, team2Id) {
  const h2h = await makeAPICall('football', 'fixtures/headtohead', {
    h2h: `${team1Id}-${team2Id}`,
    last: '10'
  });
  
  return h2h?.response || [];
}

// Obține forma echipelor
async function getTeamForm(teamId, venue = 'all') {
  const fixtures = await makeAPICall('football', 'fixtures', {
    team: teamId,
    last: '5',
    venue: venue // 'home', 'away', 'all'
  });
  
  return fixtures?.response || [];
}

// Obține clasamentul
async function getLeagueStandings() {
  const standings = await makeAPICall('football', 'standings', {
    league: '283', // Liga 1 Romania
    season: '2024'
  });
  
  return standings?.response?.[0]?.league?.standings?.[0] || [];
}

// Obține statistici detaliate
async function getTeamStatistics(teamId) {
  const stats = await makeAPICall('football', 'teams/statistics', {
    league: '283',
    season: '2024',
    team: teamId
  });
  
  return stats?.response || null;
}

// Obține cote (dacă disponibile)
async function getMatchOdds(fixtureId) {
  const odds = await makeAPICall('football', 'odds', {
    fixture: fixtureId,
    bet: '1' // Match Winner
  });
  
  return odds?.response || [];
}

// === MAIN ANALYSIS FUNCTION ===
async function analyzeMatch(homeTeam, awayTeam) {
  console.log('🚀 Încep analiza completă...');
  
  const analysis = {
    matchInfo: null,
    h2h: [],
    homeForm: [],
    awayForm: [],
    standings: [],
    homeStats: null,
    awayStats: null,
    odds: []
  };

  try {
    // 1. Găsește meciul
    const matchResult = await findTeamAndFixture(homeTeam, awayTeam);
    analysis.matchInfo = matchResult;

    if (matchResult.fixture) {
      const homeId = matchResult.fixture.teams.home.id;
      const awayId = matchResult.fixture.teams.away.id;
      const fixtureId = matchResult.fixture.fixture.id;

      // 2. Obține toate datele în paralel
      const [h2h, homeForm, awayForm, homeAwayForm, awayAwayForm, standings, homeStats, awayStats, odds] = await Promise.all([
        getH2HStats(homeId, awayId),
        getTeamForm(homeId, 'home'),
        getTeamForm(awayId, 'away'),
        getTeamForm(homeId, 'all'),
        getTeamForm(awayId, 'all'),
        getLeagueStandings(),
        getTeamStatistics(homeId),
        getTeamStatistics(awayId),
        getMatchOdds(fixtureId)
      ]);

      analysis.h2h = h2h;
      analysis.homeForm = homeForm;
      analysis.awayForm = awayForm;
      analysis.homeFormAll = homeAwayForm;
      analysis.awayFormAll = awayAwayForm;
      analysis.standings = standings;
      analysis.homeStats = homeStats;
      analysis.awayStats = awayStats;
      analysis.odds = odds;
    }

  } catch (error) {
    console.error('❌ Eroare în analiză:', error.message);
  }

  return analysis;
}

// === SYSTEM PROMPT ===
const systemPrompt = `
Ești **LucyOFM Bot**, analist profesionist român cu acces la API-uri sportive LIVE.

Primești date JSON reale și complete. Analizează-le și returnează exact 10 puncte numerotate:

✅ **1. Informații Meci Live**: Data, ora, stadion din datele reale API
📊 **2. Cote Oficiale**: Dacă sunt disponibile în API, altfel menționează "cote indisponibile"
📈 **3. H2H Ultimele 10**: Rezultate exacte din API cu scoruri reale
📊 **4. Forma Gazde (Acasă)**: Ultimele 5 acasă - rezultate exacte (W/D/L + scoruri)
📊 **5. Forma Oaspeți (Deplasare)**: Ultimele 5 deplasare - rezultate exacte
🏆 **6. Clasament LIVE**: Poziții exacte, puncte, diferența goluri din API
⚽ **7. Statistici Goluri**: GG%, BTTS%, Over/Under din datele reale API
📋 **8. Statistici Avansate**: Cornere/meci, posesie%, cartonașe din API
🎯 **9. Analiza Forței**: Bazat pe datele reale - formă, clasament, H2H
🎯 **10. Predicții Finale**: Scor estimat + recomandări pariuri cu logică

IMPORTANT: 
- Folosește DOAR datele reale din JSON
- Dacă o informație lipsește din API, scrie "Date indisponibile"
- Citează sursa: "API-Football" sau "TheSportsDB"
- Fii precis cu numerele (scoruri, procente, poziții)
- Nu inventa nimic!

Folosește emoji-uri: ✅📊📈🏆⚽📋🎯⚠️
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
    console.log('🏁 Procesez meciul:', prompt);
    
    // Parse meciul (Rapid - FCSB, Dinamo vs UTA, etc.)
    const matchParsed = prompt
      .replace(/\s*(vs?|versus|-|–)\s*/gi, '|')
      .split('|')
      .map(team => team.trim())
      .filter(team => team.length > 0);

    if (matchParsed.length < 2) {
      return res.status(400).json({ 
        error: "Format invalid. Folosește: 'Echipa1 - Echipa2' sau 'Echipa1 vs Echipa2'" 
      });
    }

    const [homeTeam, awayTeam] = matchParsed;
    console.log(`🏟️ Gazde: ${homeTeam} | Oaspeți: ${awayTeam}`);

    // Analiză completă cu API-uri
    const analysisData = await analyzeMatch(homeTeam, awayTeam);
    
    // Convertește în text pentru GPT
    const apiDataText = `
ANALIZĂ COMPLETĂ ${homeTeam.toUpperCase()} vs ${awayTeam.toUpperCase()}

=== DATE MECI ===
${JSON.stringify(analysisData.matchInfo, null, 2)}

=== H2H ISTORIC ===
${JSON.stringify(analysisData.h2h, null, 2)}

=== FORMA GAZDE ===
${JSON.stringify(analysisData.homeForm, null, 2)}

=== FORMA OASPEȚI ===
${JSON.stringify(analysisData.awayForm, null, 2)}

=== CLASAMENT ===
${JSON.stringify(analysisData.standings, null, 2)}

=== STATISTICI GAZDE ===
${JSON.stringify(analysisData.homeStats, null, 2)}

=== STATISTICI OASPEȚI ===
${JSON.stringify(analysisData.awayStats, null, 2)}

=== COTE ===
${JSON.stringify(analysisData.odds, null, 2)}
`;

    // Trimite la GPT-4 pentru analiză
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Analizează datele reale din API:\n\n${apiDataText}` },
      ],
      max_tokens: 1800,
      temperature: 0.2,
    });
    
    console.log('✅ Analiza completată cu date reale din API');
    res.status(200).json({ reply: completion.choices[0].message.content });
    
  } catch (err) {
    console.error("❌ Eroare completă:", err.message);
    
    if (err.message.includes('API key')) {
      return res.status(500).json({ error: "Cheie OpenAI invalidă." });
    }
    
    res.status(500).json({ 
      error: `Eroare analiză: ${err.message}`,
      details: "Verifică conexiunea și cheile API"
    });
  }
}
