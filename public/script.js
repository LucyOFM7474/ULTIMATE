 async function analizeaza() {
  const prompt = document.getElementById("prompt").value.trim();
  const rezultat = document.getElementById("rezultat");
  
  if (!prompt) {
    rezultat.textContent = "⚠️ Te rog introdu un meci (ex: CFR Cluj - UTA Arad)";
    return;
  }

  const btnAnalizeaza = document.querySelector("button");
  btnAnalizeaza.disabled = true;
  rezultat.textContent = "⏳ Analizez " + prompt + "...";

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });
    
    const data = await response.json();
    
    if (!response.ok) throw new Error(data.error || `Eroare ${response.status}`);
    
    if (data.success && data.reply) {
      rezultat.innerHTML = data.reply.replace(/\n/g, '<br>');
      salveazaIstoric(prompt, data.reply);
    } else {
      throw new Error(data.error || "Răspuns invalid de la server");
    }
    
  } catch (error) {
    console.error("Eroare frontend:", error);
    rezultat.textContent = `❌ ${error.message}`;
  } finally {
    btnAnalizeaza.disabled = false;
  }
}

// Funcțiile salveazaIstoric și stergeIstoric rămân aceleași
