 async function analizeaza() {
  const prompt = document.getElementById("prompt").value.trim();
  const rezultat = document.getElementById("rezultat");
  
  if (!prompt) {
    rezultat.textContent = "⚠️ Introdu un meci valid (exemplu: Rapid - FCSB)";
    return;
  }

  rezultat.textContent = "⏳ Analizez meciul " + prompt + "...";

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt: prompt })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success && data.reply) {
      rezultat.textContent = data.reply;
      salveazaIstoric(prompt, data.reply);
    } else {
      rezultat.textContent = "❌ " + (data.error || "Eroare necunoscuta");
    }
    
  } catch (error) {
    rezultat.textContent = "💥 Eroare: " + error.message;
  }
}

function salveazaIstoric(meci, rezultat) {
  try {
    let istoric = JSON.parse(localStorage.getItem("lucyofm_istoric") || "[]");
    istoric.unshift({ meci, rezultat, data: new Date().toISOString() });
    localStorage.setItem("lucyofm_istoric", JSON.stringify(istoric.slice(0, 50)));
  } catch (e) {
    console.log("Istoric error:", e);
  }
}

function stergeIstoric() {
  localStorage.removeItem("lucyofm_istoric");
  alert("Istoric sters!");
  location.reload();
}
