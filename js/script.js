// Zoom In/Out
let fontSize = 16;

document.getElementById("zoom-in").addEventListener("click", () => {
  fontSize += 1;
  document.body.style.fontSize = `${fontSize}px`;
});

document.getElementById("zoom-out").addEventListener("click", () => {
  fontSize = Math.max(12, fontSize - 1);
  document.body.style.fontSize = `${fontSize}px`;
});

// Dark/Light Mode
document.getElementById("toggle-mode").addEventListener("click", () => {
  document.body.classList.toggle("light-mode");
  document.body.classList.toggle("dark-mode");
});

// Carrossel simples
let currentIndex = 0;
const images = document.querySelectorAll(".carousel-img");

setInterval(() => {
  images[currentIndex].classList.remove("active");
  currentIndex = (currentIndex + 1) % images.length;
  images[currentIndex].classList.add("active");
}, 4000); // muda a imagem a cada 4 segundos
// Contador de acessos usando countapi.xyz
fetch("https://api.countapi.xyz/hit/awaken-portal.com/visits")
  .then(res => res.json())
  .then(data => {
    document.getElementById("visit-count").textContent = data.value;
  })
  .catch(err => {
    console.error("Erro ao carregar contador:", err);
    document.getElementById("visit-count").textContent = "N/A";
  });

(function accessCounter(){
  let n = Number(localStorage.getItem("acessosSleeper") || 0);
  n++;
  localStorage.setItem("acessosSleeper", n);
  document.getElementById("accessCount").textContent = `GMs em ação: ${n}`;
})();

<!-- conteudo complementar pesquisas -->

  /* --------------------------
   Dados estáticos: 32 times (nomes completos)
   -------------------------- */
const nflTeams = [
  "Arizona Cardinals","Atlanta Falcons","Baltimore Ravens","Buffalo Bills",
  "Carolina Panthers","Chicago Bears","Cincinnati Bengals","Cleveland Browns",
  "Dallas Cowboys","Denver Broncos","Detroit Lions","Green Bay Packers",
  "Houston Texans","Indianapolis Colts","Jacksonville Jaguars","Kansas City Chiefs",
  "Las Vegas Raiders","Los Angeles Chargers","Los Angeles Rams","Miami Dolphins",
  "Minnesota Vikings","New England Patriots","New Orleans Saints","New York Giants",
  "New York Jets","Philadelphia Eagles","Pittsburgh Steelers","San Francisco 49ers",
  "Seattle Seahawks","Tampa Bay Buccaneers","Tennessee Titans","Washington Commanders"
];

/* map abbr -> full */
const abbrToFull = {
  ARI: "Arizona Cardinals", ATL: "Atlanta Falcons", BAL: "Baltimore Ravens", BUF: "Buffalo Bills",
  CAR: "Carolina Panthers", CHI: "Chicago Bears", CIN: "Cincinnati Bengals", CLE: "Cleveland Browns",
  DAL: "Dallas Cowboys", DEN: "Denver Broncos", DET: "Detroit Lions", GB: "Green Bay Packers",
  HOU: "Houston Texans", IND: "Indianapolis Colts", JAX: "Jacksonville Jaguars", KC: "Kansas City Chiefs",
  LV: "Las Vegas Raiders", LAC: "Los Angeles Chargers", LAR: "Los Angeles Rams", MIA: "Miami Dolphins",
  MIN: "Minnesota Vikings", NE: "New England Patriots", NO: "New Orleans Saints", NYG: "New York Giants",
  NYJ: "New York Jets", PHI: "Philadelphia Eagles", PIT: "Pittsburgh Steelers", SF: "San Francisco 49ers",
  SEA: "Seattle Seahawks", TB: "Tampa Bay Buccaneers", TEN: "Tennessee Titans", WSH: "Washington Commanders",
  WAS: "Washington Commanders"
};

/* helpers */
function normalizeName(s){ if(!s) return ""; return String(s).toLowerCase().replace(/[^a-z0-9]/g,""); }
function matchTeamByName(name){
  if(!name) return "";
  const n = normalizeName(name);
  for(const t of nflTeams){ if(normalizeName(t).includes(n) || n.includes(normalizeName(t))) return t; }
  return name;
}
function abbrToFullName(abbr){ if(!abbr) return ""; return abbrToFull[String(abbr).toUpperCase()] || ""; }

/* UI refs */
const resultado = document.getElementById("resultado");
const franchiseActions = document.getElementById("franchiseActions");

/* dark toggle */
document.getElementById("darkToggle").addEventListener("click", ()=>{
  document.body.classList.toggle("dark");
  document.getElementById("darkToggle").textContent = document.body.classList.contains("dark") ? "☀️ Light Mode" : "🌙 Dark Mode";
});

/* access counter */
(function accessCounter(){
  let n = Number(localStorage.getItem("acessosSleeper") || 0);
  n++;
  localStorage.setItem("acessosSleeper", n);
  document.getElementById("accessCount").textContent = `GMs em ação: ${n}`;
})();

/* status helpers */
function statusClass(status){
  if(!status) return "status-Healthy";
  if(status === "Out") return "status-Out";
  if(status === "Questionable" || status === "Doubtful") return "status-Questionable";
  if(status === "IR") return "status-IR";
  if(status === "Suspended") return "status-Suspended";
  return "status-Healthy";
}
function getColorForStatus(status){
  switch(status){
    case "Out": return "#b71c1c";
    case "Questionable": case "Doubtful": return "#ef6c00";
    case "IR": return "#6a1b9a";
    case "Suspended": return "#424242";
    default: return "#2e7d32";
  }
}

/* fetch util */
async function safeFetchJson(url){
  const res = await fetch(url);
  if(!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return await res.json();
}

/* build franchise team select (search 4) */
(function populateTeamSelect(){
  const s = document.getElementById("franchiseTeamSelect");
  nflTeams.forEach(t => {
    const o = document.createElement("option");
    o.value = t;
    o.textContent = t;
    s.appendChild(o);
  });
})();

/* ---------------------------------------------------------
   Position-empty detection helper
   - Recebe: starters array, players map, optional rosterPositions (array)
   - Retorna: { countEmpty, emptySlots: [{index, name?}] }
   --------------------------------------------------------- */
function detectEmptyPositions(starters, playersMap, rosterPositions){
  const emptySlots = [];
  for (let i = 0; i < (starters || []).length; i++){
    const pid = starters[i];
    const isEmpty = !pid || pid === 0 || pid === "0" || pid === null || pid === "" || !playersMap[pid];
    if(isEmpty){
      // try to get position name from rosterPositions (mapping by index if possible)
      let name = null;
      if(Array.isArray(rosterPositions) && rosterPositions[i]) name = rosterPositions[i];
      emptySlots.push({ index: i, name });
    }
  }
  return { countEmpty: emptySlots.length, emptySlots };
}

/* ---------------------------------------------------------
   1) Buscar por USUÁRIO
   - faz fetch /user/:username
   - pega leagues com /user/:id/leagues/nfl/{year} (these objects include settings)
   - para cada league (type 2 = fantasy), busca rosters e players
   - exibe cards para cada time do usuário
   - adiciona ícone para copiar league_id (com tooltip)
   - detecta posições vazias usando league.settings.roster_positions (quando disponível)
   --------------------------------------------------------- */
async function buscarPorUsuario(){
  const username = document.getElementById("username").value.trim();
  document.getElementById("franchiseActions").style.display = "none";
  resultado.innerHTML = `<div class="panel">Buscando usuário ${username}...</div>`;
  if(!username){ resultado.innerHTML = `<div class="panel" style="color:var(--bad)">Informe um nome de usuário.</div>`; return; }

  try{
    const userData = await safeFetchJson(`https://api.sleeper.app/v1/user/${username}`);
    if(!userData || !userData.user_id){ resultado.innerHTML = `<div class="panel" style="color:var(--bad)">Usuário não encontrado.</div>`; return; }

    const [leagues, playersObj] = await Promise.all([
      safeFetchJson(`https://api.sleeper.app/v1/user/${userData.user_id}/leagues/nfl/${new Date().getFullYear()}`),
      safeFetchJson("https://api.sleeper.app/v1/players/nfl")
    ]);
    const players = playersObj || {};
    resultado.innerHTML = "";

    const fantasyLeagues = (leagues || []).filter(l => l.settings && l.settings.type === 2);

    // iterate leagues
    for(const league of fantasyLeagues){
      try{
        // fetch rosters for this league
        const rosters = await safeFetchJson(`https://api.sleeper.app/v1/league/${league.league_id}/rosters`);
        const roster = (rosters||[]).find(r => r.owner_id === userData.user_id);
        if(!roster) continue;

        const leagueObj = league; // league object includes settings
        const rosterPositions = (leagueObj?.settings?.roster_positions) || null;

        const starters = roster.starters || [];
        const injured = [];
        for(const pid of starters){
          const p = players[pid];
          if(!p) continue;
          if(p.injury_status && p.injury_status !== "Healthy") injured.push(p);
        }

        // detect empty positions
        const empties = detectEmptyPositions(starters, players, rosterPositions);

        // create card
        const card = document.createElement("div"); card.className = "team-card";
        const header = document.createElement("div"); header.className = "team-header";
        header.innerHTML = `
          <div class="left">
            <div>
              <div class="team-title">${matchTeamByName(roster.metadata?.team_name || league.name || "Time sem nome")} — Liga ID: ${league.league_id}</div>
              <div class="team-meta">${league.name}</div>
            </div>
          </div>
          <div class="team-badges right">
            <div class="team-badge inj">${injured.length}</div>
            <div style="margin-left:8px;">
              <button class="copy-btn" title="Copiar League ID" onclick="copyLeagueId(this,'${league.league_id}')">
                <span class="ico">📋</span>
              </button>
            </div>
          </div>
        `;
        header.addEventListener("click", ()=> toggleTeamBody(card));

        const body = document.createElement("div"); body.className = "team-body";

        // show empty positions alert at top if any (requirement)
        if(empties.countEmpty > 0){
          const names = empties.emptySlots.map(s => s.name || 'Posição sem jogador').join(', ');
          const emptyDiv = document.createElement("div");
          emptyDiv.className = "empty-pos";
          emptyDiv.textContent = `Alerta de ${empties.countEmpty} Posições sem Jogador escalado: ${names}`;
          body.appendChild(emptyDiv);
        }

        if(injured.length === 0){
          const s = document.createElement("div"); s.className = "summary"; s.textContent = "Nenhum titular lesionado encontrado nesta liga.";
          body.appendChild(s);
        } else {
          body.style.display = "block";
          for(const p of injured){
            const pl = document.createElement("div"); pl.className = "player-card";
            pl.innerHTML = `
              <div class="player-left">
                <div style="width:8px;height:40px;border-radius:6px;background:${getColorForStatus(p.injury_status)}"></div>
                <div>
                  <div class="player-name">${p.full_name}</div>
                  <div class="player-pos">${p.position || "?"} — ${p.team || "FA"}</div>
                </div>
              </div>
              <div><div class="status-pill ${statusClass(p.injury_status)}">${p.injury_status}</div></div>
            `;
            body.appendChild(pl);
          }
        }

        card.appendChild(header); card.appendChild(body);
        resultado.appendChild(card);
      } catch(errInner){
        console.warn("Erro ao processar liga", league.league_id, errInner);
      }
    }
  } catch(err){
    console.error(err);
    resultado.innerHTML = `<div class="panel" style="color:var(--bad)">Erro ao buscar usuário.</div>`;
  }
}

/* copy LeagueID icon handler with small tooltip feedback */
function copyLeagueId(btn, leagueId){
  navigator.clipboard.writeText(leagueId).then(()=>{
    // create temporary toast
    let toast = btn.querySelector('.copy-toast');
    if(!toast){
      toast = document.createElement('div'); toast.className = 'copy-toast';
      toast.textContent = 'ID copiado';
      btn.appendChild(toast);
    }
    toast.style.display = 'block';
    setTimeout(()=>{ toast.style.display = 'none'; }, 1400);
  }).catch(()=> alert('Não foi possível copiar o League ID automaticamente.'));
}

/* ----------------------------------------
   2) Buscar por League ID
   - Exibe todos os times da liga, detecta posições vazias usando league.settings.roster_positions
   ---------------------------------------- */
async function buscarPorLiga(){
  const leagueId = document.getElementById("leagueId").value.trim();
  document.getElementById("franchiseActions").style.display = "none";
  resultado.innerHTML = `<div class="panel">Buscando liga ${leagueId}...</div>`;
  if(!leagueId){ resultado.innerHTML = `<div class="panel" style="color:var(--bad)">Informe um League ID.</div>`; return; }

  try{
    // fetch league, users, rosters and players
    const [leagueObj, users, rosters, playersObj] = await Promise.all([
      safeFetchJson(`https://api.sleeper.app/v1/league/${leagueId}`),
      safeFetchJson(`https://api.sleeper.app/v1/league/${leagueId}/users`),
      safeFetchJson(`https://api.sleeper.app/v1/league/${leagueId}/rosters`),
      safeFetchJson(`https://api.sleeper.app/v1/players/nfl`)
    ]);
    const players = playersObj || {};
    const rosterPositions = leagueObj?.settings?.roster_positions || null;

    const userMap = {};
    (users||[]).forEach(u => userMap[u.user_id] = { name: u.display_name || "Time sem dono", teamMeta: u.metadata?.team_name || "" });

    resultado.innerHTML = "";

    for(const r of (rosters||[])){
      const owner = userMap[r.owner_id] || { name:"Time sem dono", teamMeta:"" };
      const teamNameRaw = r.metadata?.team_name || owner.teamMeta || owner.name || "Sem nome definido";
      const detected = matchTeamByName(teamNameRaw) || teamNameRaw;

      const starters = (r.starters || []);
      const injuredPlayers = [];
      for(const pid of starters){
        const p = players[pid];
        if(!p) continue;
        if(p.injury_status && p.injury_status !== "Healthy") injuredPlayers.push(p);
      }

      // detect empty positions using league roster_positions mapping
      const empties = detectEmptyPositions(starters, players, rosterPositions);

      const card = document.createElement("div"); card.className = "team-card";
      const header = document.createElement("div"); header.className = "team-header";
      header.innerHTML = `
        <div class="left">
          <div>
            <div class="team-title">${detected} — ${owner.name}</div>
            <div class="team-meta">${teamNameRaw ? `meta: ${teamNameRaw}` : 'sem metadata'}</div>
          </div>
        </div>
        <div class="team-badges right">
          <div class="team-badge inj">${injuredPlayers.length}</div>
        </div>
      `;
      header.addEventListener("click", ()=>toggleTeamBody(card));

      const body = document.createElement("div"); body.className = "team-body";

      if(empties.countEmpty > 0){
        const names = empties.emptySlots.map(s => s.name || 'Posição sem jogador').join(', ');
        const emptyDiv = document.createElement("div");
        emptyDiv.className = "empty-pos";
        emptyDiv.textContent = `Alerta de ${empties.countEmpty} Posições sem Jogador escalado: ${names}`;
        body.appendChild(emptyDiv);
      }

      if(injuredPlayers.length === 0){
        body.innerHTML += `<div class="summary">Nenhum titular lesionado.</div>`;
      } else {
        body.style.display = "block";
        for(const p of injuredPlayers){
          const pl = document.createElement("div"); pl.className = "player-card";
          pl.innerHTML = `
            <div class="player-left">
              <div style="width:8px;height:40px;border-radius:6px;background:${getColorForStatus(p.injury_status)}"></div>
              <div>
                <div class="player-name">${p.full_name}</div>
                <div class="player-pos">${p.position || "?"} — ${p.team || "FA"}</div>
              </div>
            </div>
            <div>
              <div class="status-pill ${statusClass(p.injury_status)}">${p.injury_status || "Healthy"}</div>
            </div>
          `;
          body.appendChild(pl);
        }
      }

      card.appendChild(header); card.appendChild(body);
      resultado.appendChild(card);
    }

  } catch(err){
    console.error(err);
    resultado.innerHTML = `<div class="panel" style="color:var(--bad)">Erro ao buscar dados da liga. Verifique o League ID.</div>`;
  }
}

/* ----------------------------------------
   3) Buscar Franchise Players (por liga)
   - checkbox onlyFailing filtra só times abaixo do mínimo
   - detecta posições vazias e mostra aviso antes da lista
   - habilita ações: expandir/recolher/export (export apenas para esse modo)
   ---------------------------------------- */
async function buscarFranchisePlayers(){
  const leagueId = document.getElementById("franchiseLeagueId").value.trim();
  const minFranchiseRaw = document.getElementById("minFranchise").value.trim();
  const minFranchise = parseInt(minFranchiseRaw || "0", 10);
  const onlyFailing = document.getElementById("onlyFailing").checked;
  resultado.innerHTML = `<div class="panel">Buscando franquias na liga ${leagueId}...</div>`;
  if(!leagueId || !minFranchiseRaw){ resultado.innerHTML = `<div class="panel" style="color:var(--bad)">Informe League ID e número mínimo.</div>`; return; }

  try {
    const [leagueObj, users, rosters, playersObj] = await Promise.all([
      safeFetchJson(`https://api.sleeper.app/v1/league/${leagueId}`),
      safeFetchJson(`https://api.sleeper.app/v1/league/${leagueId}/users`),
      safeFetchJson(`https://api.sleeper.app/v1/league/${leagueId}/rosters`),
      safeFetchJson("https://api.sleeper.app/v1/players/nfl")
    ]);
    const players = playersObj || {};
    const rosterPositions = leagueObj?.settings?.roster_positions || null;

    const userMap = {};
    (users||[]).forEach(u => {
      userMap[u.user_id] = {
        name: u.display_name || "Time sem dono",
        userTeamMeta: u.metadata?.team_name || ""
      };
    });

    const enriched = (rosters || []).map(r => {
      const owner = userMap[r.owner_id] || {name:"Time sem dono", userTeamMeta:""};
      const rawMeta = r.metadata?.team_name || owner.userTeamMeta || owner.name || "";
      let detected = matchTeamByName(rawMeta);
      const starters = (r.starters || []).map(id => players[id]).filter(Boolean);
      if(!detected){
        const counts = {};
        for(const p of starters){ if(!p || !p.team) continue; counts[p.team] = (counts[p.team]||0)+1; }
        let bestAbbr="", bestCount=0;
        for(const k in counts){ if(counts[k] > bestCount){ bestAbbr = k; bestCount = counts[k]; } }
        if(bestAbbr){ detected = abbrToFullName(bestAbbr) || bestAbbr; }
      }
      if(!detected) detected = rawMeta || owner.name || "Franquia sem nome";

      const franchiseStarters = [];
      for(const p of starters){
        const pFull = abbrToFullName(p.team) || p.team || "";
        if(normalizeName(pFull) === normalizeName(detected) || normalizeName(pFull).includes(normalizeName(detected)) || normalizeName(detected).includes(normalizeName(pFull))){
          franchiseStarters.push(p);
        }
      }
      const healthyFranchise = franchiseStarters.filter(p=>!p.injury_status || p.injury_status === "Healthy").length;
      const franchiseCount = franchiseStarters.length;
      const injuredOverall = starters.filter(p => p.injury_status && p.injury_status !== "Healthy").length;

      return { roster: r, owner, rawMeta, detected, starters, franchiseStarters, franchiseCount, healthyFranchise, injuredOverall };
    });

    enriched.sort((a,b) => (a.detected || "").localeCompare(b.detected || ""));

    resultado.innerHTML = "";
    if(franchiseActions) franchiseActions.style.display = "flex";

    for(const en of enriched){
      // apply filter onlyFailing
      const healthyFranchise = en.healthyFranchise;
      if(onlyFailing && healthyFranchise >= minFranchise) continue;

      const r = en.roster, owner = en.owner;
      const franchiseName = en.detected;
      const starters = en.starters || [];

      // compute starters raw from roster (need to detect empties using the roster object)
      const rawStartersIds = en.roster.starters || [];
      // create card
      const card = document.createElement("div"); card.className = "team-card";
      const header = document.createElement("div"); header.className = "team-header";
      header.innerHTML = `
        <div class="left">
          <div>
            <div class="team-title">${franchiseName} — ${owner.name}</div>
            <div class="team-meta">${en.rawMeta ? `meta: ${en.rawMeta}` : ''}</div>
          </div>
        </div>
        <div class="team-badges right">
          <div class="team-badge franchise" data-franchise-count>${en.franchiseCount}</div>
          <div class="team-badge inj" data-injured-count>${en.injuredOverall}</div>
        </div>
      `;
      header.addEventListener("click", ()=>toggleTeamBody(card));

      const body = document.createElement("div"); body.className = "team-body";
      const franchiseRow = document.createElement("div");
      franchiseRow.style.marginBottom = "8px";
      franchiseRow.innerHTML = `
        <label style="font-weight:700;margin-right:8px;">Nome da Franquia (edite se necessário):</label>
        <input type="text" class="team-input" value="${franchiseName}" style="padding:6px 8px;border-radius:6px;border:1px solid #ccc;width:60%;" />
      `;
      body.appendChild(franchiseRow);

      const containerPlayers = document.createElement("div"); containerPlayers.className = "players-list";
      body.appendChild(containerPlayers);

      // recompute function
      function recompute(){
        containerPlayers.innerHTML = "";

        const franchiseVal = (franchiseRow.querySelector(".team-input").value || "").trim();
        let franchiseFull = franchiseVal;
        if(franchiseVal && franchiseVal.length <= 3){
          const mapped = abbrToFullName(franchiseVal.toUpperCase());
          if(mapped) franchiseFull = mapped;
        } else {
          const matched = matchTeamByName(franchiseVal);
          if(matched) franchiseFull = matched;
        }
        if(!franchiseFull) franchiseFull = franchiseName;

        // compute franchiseStartersNow based on franchiseFull using starters (en.starters)
        const franchiseStartersNow = [];
        for(const p of en.starters){
          const pFull = abbrToFullName(p.team) || p.team || "";
          if(normalizeName(pFull) === normalizeName(franchiseFull) || normalizeName(pFull).includes(normalizeName(franchiseFull)) || normalizeName(franchiseFull).includes(normalizeName(pFull))){
            franchiseStartersNow.push(p);
          }
        }
        const healthyFrNow = franchiseStartersNow.filter(p=>!p.injury_status || p.injury_status === "Healthy").length;
        const franchiseCountNow = franchiseStartersNow.length;

        // non-healthy starters
        const nonHealthyStarters = en.starters.filter(p => p.injury_status && p.injury_status !== "Healthy");

        // detect empties using rosterPositions
        const empties = detectEmptyPositions(rawStartersIds, (awaitPlayersSnapshot()), leagueObj?.settings?.roster_positions);

        // update header badges
        const frBadge = header.querySelector("[data-franchise-count]");
        const injBadge = header.querySelector("[data-injured-count]");
        if(frBadge) frBadge.textContent = franchiseCountNow;
        if(injBadge) injBadge.textContent = nonHealthyStarters.length;

        // summary
        const summary = document.createElement("div"); summary.className = "summary";
        summary.innerHTML = `Titulares da franquia identificados: <strong>${franchiseCountNow}</strong> — Saudáveis: <strong>${healthyFrNow}</strong> (mínimo: <strong>${minFranchise}</strong>)`;
        containerPlayers.appendChild(summary);

        // status line
        const statusLine = document.createElement("div"); statusLine.style.marginTop = "6px";
        if(healthyFrNow >= minFranchise){
          statusLine.innerHTML = `<div style="color:var(--ok);font-weight:800;margin-top:6px;">✅ Bom trabalho — franquia atende o mínimo.</div>`;
        } else {
          const falta = minFranchise - healthyFrNow;
          statusLine.innerHTML = `<div style="color:var(--bad);font-weight:800;margin-top:6px;">⚠️ Franquia em Risco — faltam <strong>${falta}</strong> titulares saudáveis.</div>`;
        }
        containerPlayers.appendChild(statusLine);

        // show empties if present (top)
        const emptiesLocal = detectEmptyPositions(rawStartersIds, (awaitPlayersSnapshot()), leagueObj?.settings?.roster_positions);
        if(emptiesLocal.countEmpty > 0){
          const names = emptiesLocal.emptySlots.map(s => s.name || 'Posição sem jogador').join(', ');
          const emptyDiv = document.createElement("div");
          emptyDiv.className = "empty-pos";
          emptyDiv.textContent = `Alerta de ${emptiesLocal.countEmpty} Posições sem Jogador escalado: ${names}`;
          containerPlayers.appendChild(emptyDiv);
        }

        // non-healthy list
        if(nonHealthyStarters.length > 0){
          const title = document.createElement("div"); title.className = "group-title"; title.textContent = "Titulares com status duvidoso:";
          containerPlayers.appendChild(title);
          const nonList = document.createElement("div"); nonList.className = "nonhealthy-list";
          for(const p of nonHealthyStarters){
            const pl = document.createElement("div"); pl.className = "player-card";
            pl.innerHTML = `
              <div class="player-left">
                <div style="width:8px;height:40px;border-radius:6px;background:${getColorForStatus(p.injury_status)}"></div>
                <div>
                  <div class="player-name">${p.full_name}</div>
                  <div class="player-pos">${p.position || "?"} — ${p.team || ""}</div>
                </div>
              </div>
              <div><div class="status-pill ${statusClass(p.injury_status)}">${p.injury_status}</div></div>
            `;
            nonList.appendChild(pl);
          }
          containerPlayers.appendChild(nonList);
        } else {
          const none = document.createElement("div"); none.style.marginTop="8px"; none.textContent = "Nenhum titular com status diferente de Healthy.";
          containerPlayers.appendChild(none);
        }

        // franchise starters list
        const frTitle = document.createElement("div"); frTitle.className = "group-title"; frTitle.textContent = "Titulares pertencentes à franquia:";
        containerPlayers.appendChild(frTitle);
        const frList = document.createElement("div"); frList.className = "franchise-list";
        if(franchiseStartersNow.length > 0){
          for(const p of franchiseStartersNow){
            const pl = document.createElement("div"); pl.className = "player-card";
            pl.innerHTML = `
              <div class="player-left">
                <div style="width:8px;height:40px;border-radius:6px;background:${getColorForStatus(p.injury_status)}"></div>
                <div>
                  <div class="player-name">${p.full_name}</div>
                  <div class="player-pos">${p.position || "?"} — ${p.team || ""}</div>
                </div>
              </div>
              <div><div class="status-pill ${statusClass(p.injury_status)}">${p.injury_status || "Healthy"}</div></div>
            `;
            frList.appendChild(pl);
          }
        } else {
          const none = document.createElement("div"); none.style.marginTop="8px"; none.textContent = "Nenhum titular da franquia foi identificado entre os starters.";
          frList.appendChild(none);
        }
        containerPlayers.appendChild(frList);

        // dataset for export
        card.dataset.franchiseCount = franchiseCountNow;
        card.dataset.healthyFranchise = healthyFrNow;
        card.dataset.injuredOverall = nonHealthyStarters.length;

        // auto-open
        if(nonHealthyStarters.length > 0 || healthyFrNow < minFranchise){
          body.style.display = "block";
        } else {
          body.style.display = "none";
        }
      } // fim recompute

      // helper snapshot players (closure to fetch players map once)
      function awaitPlayersSnapshot(){
        // playersObj is in outer scope (from earlier API call) - used to map ids
        return players; // players map from outer scope
      }

      recompute();

      const inputEl = franchiseRow.querySelector(".team-input");
      inputEl.addEventListener("change", recompute);
      inputEl.addEventListener("keyup", (e)=>{ if(e.key === "Enter") recompute(); });

      card.appendChild(header);
      card.appendChild(body);
      resultado.appendChild(card);
    }

    // wire actions for expand/collapse/export
    document.getElementById("expandAllBtn").onclick = ()=> {
      document.querySelectorAll(".team-body").forEach(b=>b.style.display="block");
    };
    document.getElementById("collapseAllBtn").onclick = ()=> {
      document.querySelectorAll(".team-body").forEach(b=>b.style.display="none");
    };
    document.getElementById("exportBtn").onclick = ()=> exportFranchiseWhatsApp(minFranchise);

  } catch(err){
    console.error(err);
    resultado.innerHTML = `<div class="panel" style="color:var(--bad)">Erro ao buscar franquias. Verifique parâmetros e League ID.</div>`;
  }
}

/* ----------------------------------------
   Export (apenas para pesquisa 3)
   ---------------------------------------- */
function exportFranchiseWhatsApp(minFranchise){
  const cards = Array.from(document.querySelectorAll(".team-card"));
  const lines = [];
  for(const card of cards){
    const input = card.querySelector(".team-input");
    if(!input) continue;
    const title = card.querySelector(".team-title")?.textContent?.trim() || "Time";
    const injured = parseInt(card.dataset.injuredOverall || "0", 10);
    const healthyFr = parseInt(card.dataset.healthyFranchise || "0", 10);
    const franchiseCount = parseInt(card.dataset.franchiseCount || "0", 10);

    if(injured > 0 || healthyFr < minFranchise){
      lines.push(`${title} — Lesionados: ${injured} | Franchise: ${franchiseCount} | Saudáveis da franchise: ${healthyFr}/${minFranchise}`);
      const nonHealthyEls = card.querySelectorAll(".nonhealthy-list .player-card");
      if(nonHealthyEls.length){
        nonHealthyEls.forEach(el=>{
          const name = el.querySelector(".player-name")?.textContent?.trim() || "";
          const pos = el.querySelector(".player-pos")?.textContent?.trim() || "";
          const status = el.querySelector(".status-pill")?.textContent?.trim() || "";
          lines.push(`  - ${name} ${pos} — ${status}`);
        });
      } else {
        lines.push("  - Nenhum titular lesionado listado.");
      }
      lines.push("");
    }
  }

  if(lines.length === 0){
    alert("Nenhum time em problema encontrado para exportar.");
    return;
  }

  const message = "Resumo - Times com problemas (Sleeper):\n\n" + lines.join("\n");
  navigator.clipboard.writeText(message).then(()=>{
    const open = confirm("Resumo copiado para área de transferência. Deseja abrir o WhatsApp Web com a mensagem preenchida?");
    if(open){
      const url = "https://web.whatsapp.com/send?text=" + encodeURIComponent(message);
      window.open(url, "_blank");
    } else {
      alert("Resumo copiado. Cole no WhatsApp ou onde preferir.");
    }
  }).catch(err=>{
    console.error(err);
    alert("Não foi possível copiar automaticamente. Aqui está o resumo:\n\n" + message);
  });
}

/* ----------------------------------------
   4) Procurar jogadores de franquia (por time + league)
   - seleciona time (nome) + league id
   - retorna jogadores que pertencem à franquia (por team abbr/full) + dono atual
   - inclui jogadores livres (free agents) pertencentes à mesma franquia (by team)
   - ignora posições que não são escaláveis na liga (league.settings.roster_positions)
   - ordena por posição: ataque (qb,te,rb,wr, etc) -> kicker -> defesa (dl,lb,db, etc) -> nome
   ---------------------------------------- */
async function buscarFranchisePlayersByTeam(){
  const teamName = document.getElementById("franchiseTeamSelect").value;
  const leagueId = document.getElementById("search4LeagueId").value.trim();
  resultado.innerHTML = `<div class="panel">Buscando jogadores da franquia ${teamName} na liga ${leagueId}...</div>`;
  if(!leagueId){ resultado.innerHTML = `<div class="panel" style="color:var(--bad)">Informe o League ID.</div>`; return; }

  try{
    // fetch league, rosters, users, players
    const [leagueObj, rosters, users, playersObj] = await Promise.all([
      safeFetchJson(`https://api.sleeper.app/v1/league/${leagueId}`),
      safeFetchJson(`https://api.sleeper.app/v1/league/${leagueId}/rosters`),
      safeFetchJson(`https://api.sleeper.app/v1/league/${leagueId}/users`),
      safeFetchJson(`https://api.sleeper.app/v1/players/nfl`)
    ]);
    const players = playersObj || {};
    const rosterPositions = leagueObj?.settings?.roster_positions || null; // positions allowed in starters layout
    const roster_positions_set = new Set((rosterPositions||[]).map(p=>p.toUpperCase()));

    // build playerId -> roster owner map
    const ownerMap = {};
    for(const r of (rosters||[])){
      (r.players || []).forEach(pid => { ownerMap[pid] = r.owner_id; });
    }
    // also build list of roster player ids to check free agents
    const rosterPlayerIds = new Set();
    (rosters||[]).forEach(r => { (r.players||[]).forEach(pid => rosterPlayerIds.add(String(pid))); });

    // user map
    const userMap = {};
    (users||[]).forEach(u => userMap[u.user_id] = { name: u.display_name || "Time sem dono" });

    // Build list of players that match the franchise team (by team abbr -> full name mapping)
    const teamAbbrs = Object.keys(abbrToFull).filter(k => abbrToFull[k] === teamName).length ? 
      Object.keys(abbrToFull).filter(k => abbrToFull[k] === teamName) : [];
    // Also allow matching by normalized full name or abbr present in player.team
    const matchedPlayers = [];

    for(const pid in players){
      const p = players[pid];
      if(!p) continue;
      const pTeamAbbr = (p.team || "").toUpperCase();
      const pFull = abbrToFullName(pTeamAbbr) || pTeamAbbr || "";
      // check match by full team name or abbr or normalized name
      if(normalizeName(pFull) === normalizeName(teamName) || normalizeName(teamName).includes(normalizeName(pFull)) || normalizeName(pFull).includes(normalizeName(teamName)) || teamAbbrs.includes(pTeamAbbr)){
        matchedPlayers.push({ id: pid, player: p });
      }
    }

    // also consider players currently on rosters whose team string equals teamName via abbr mapping
    // matchedPlayers now contains both rostered players and free agents for that franchise

    // Partition into rostered (have owner) vs free (no owner in ownerMap)
    const rostered = [], freeAgents = [];
    for(const mp of matchedPlayers){
      const pid = String(mp.id);
      if(rosterPlayerIds.has(pid)) rostered.push(mp);
      else freeAgents.push(mp);
    }

    // function to get owner name for a pid
    function ownerNameFor(pid){
      const ownerId = ownerMap[pid];
      if(!ownerId) return null;
      return userMap[ownerId]?.name || ownerId || "GM desconhecido";
    }

    // Filter positions not allowed by league (if roster_positions exists)
    function isPositionScorable(pos){
      if(!pos) return true; // if we don't know allowed positions, keep it
      if(!roster_positions_set.size) return true;
      // many leagues list position codes like QB, RB, WR, TE, K, DST, etc.
      const up = String(pos || "").toUpperCase();
      // consider common mappings: 'DB','LB','DL' are defensive; some players have 'PK' or 'K'; allow if present in roster_positions
      return roster_positions_set.has(up) || roster_positions_set.has(up.substring(0,2));
    }

    // Build final lists and filter by scorable positions
    const roFiltered = rostered.filter(rp => isPositionScorable(rp.player.position));
    const freeFiltered = freeAgents.filter(rp => isPositionScorable(rp.player.position));

    // Sorting: position groups => attack (qb,te,rb,wr,other attack), kicker, defense, then name
    const attackPositions = new Set(['QB','RB','WR','TE','FB','RB/WR','WR/RB']);
    const kickerPositions = new Set(['K','PK']);
    const defensePositions = new Set(['DL','LB','DB','CB','S','DE','DT','EDGE','CB/S','DB/S','LB/ILB','DB']);

    function positionRank(pos){
      if(!pos) return 4;
      const up = pos.toUpperCase();
      if(attackPositions.has(up)) return 1;
      if(kickerPositions.has(up)) return 2;
      if(defensePositions.has(up)) return 3;
      return 1; // default to attack-like if unknown
    }

    function sortPlayers(arr){
      return arr.sort((a,b)=>{
        const pa = a.player.position || '';
        const pb = b.player.position || '';
        const ra = positionRank(pa), rb = positionRank(pb);
        if(ra !== rb) return ra - rb;
        const na = String(a.player.full_name || '').localeCompare(String(b.player.full_name || ''));
        return na;
      });
    }

    const roSorted = sortPlayers(roFiltered);
    const freeSorted = sortPlayers(freeFiltered);

    // render results
    resultado.innerHTML = "";
    const panel = document.createElement("div"); panel.className = "panel";
    panel.innerHTML = `<h3>Franquia: ${teamName} — Liga ${leagueId}</h3>`;
    resultado.appendChild(panel);

    // Rostered players section
    const rosterSection = document.createElement("div");
    rosterSection.className = "panel";
    rosterSection.innerHTML = `<h4>Jogadores em times (rostered): ${roSorted.length}</h4>`;
    if(roSorted.length === 0){
      rosterSection.innerHTML += `<div style="color:var(--muted)">Nenhum jogador da franquia encontrado em rosters desta liga.</div>`;
    } else {
      roSorted.forEach(item => {
        const p = item.player;
        const pid = item.id;
        const ownerName = ownerNameFor(pid) || 'Livre';
        const card = document.createElement("div"); card.className = "player-card";
        card.innerHTML = `
          <div class="player-left">
            <div style="width:8px;height:40px;border-radius:6px;background:${getColorForStatus(p.injury_status)}"></div>
            <div>
              <div class="player-name">${p.full_name}</div>
              <div class="player-pos">${p.position || "?"} — ${p.team || ""}</div>
            </div>
          </div>
          <div style="text-align:right">
            <div style="font-weight:700">${ownerName}</div>
            <div style="font-size:12px;color:var(--muted)">${p.injury_status || 'Healthy'}</div>
          </div>
        `;
        rosterSection.appendChild(card);
      });
    }
    resultado.appendChild(rosterSection);

    // Free agents section
    const freeSection = document.createElement("div");
    freeSection.className = "panel";
    freeSection.innerHTML = `<h4>Jogadores livres (Free Agents) da franquia: ${freeSorted.length}</h4>`;
    if(freeSorted.length === 0){
      freeSection.innerHTML += `<div style="color:var(--muted)">Nenhum jogador livre da franquia encontrado (ou posições não escaláveis foram ignoradas).</div>`;
    } else {
      freeSorted.forEach(item => {
        const p = item.player;
        const pid = item.id;
        const card = document.createElement("div"); card.className = "player-card";
        card.innerHTML = `
          <div class="player-left">
            <div style="width:8px;height:40px;border-radius:6px;background:${getColorForStatus(p.injury_status)}"></div>
            <div>
              <div class="player-name">${p.full_name}</div>
              <div class="player-pos">${p.position || "?"} — ${p.team || ""}</div>
            </div>
          </div>
          <div style="text-align:right">
            <div style="font-weight:700">Livre</div>
            <div style="font-size:12px;color:var(--muted)">${p.injury_status || 'Healthy'}</div>
          </div>
        `;
        freeSection.appendChild(card);
      });
    }
    resultado.appendChild(freeSection);

  } catch(err){
    console.error(err);
    resultado.innerHTML = `<div class="panel" style="color:var(--bad)">Erro ao buscar jogadores da franquia. Verifique o League ID e o time selecionado.</div>`;
  }
}

/* helper to toggle team body */
function toggleTeamBody(el){
  const body = el.querySelector(".team-body");
  if(!body) return;
  const isOpen = body.style.display === "block";
  body.style.display = isOpen ? "none" : "block";
}
const noticias = [
      {
        imagem: "https://i.ibb.co/h1LKqnrc/nflschedule-w5.jpg", // imagem exemplo
        alt: "Jogos Semana5 2025"
      },
      {
        imagem: "https://pbs.twimg.com/media/Gq8yKxvXoAAbt1_?format=jpg&name=900x900", // imagem exemplo
        alt: "Bye Weeks 2025"
      },
      {
        imagem: "https://i.ibb.co/rRvV3qBH/tankathon-w5.png", // imagem exemplo
        alt: "Tankathon 2026 - Posições semana 5"
      },
      {
       imagem: "https://i.ibb.co/hJc0pPSH/classificacao-w4.png", // imagem exemplo
        alt: "Classificação até a semana 4."
      }
    ];
    // -----------------------------------------------

    const carousel = document.getElementById('carousel');
    const inner = document.getElementById('carouselInner');
    const indicatorsBox = document.getElementById('indicators');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    // Criar slides e indicadores dinamicamente
    noticias.forEach((n, i) => {
      const slide = document.createElement('div');
      slide.className = 'carousel-content';
      if (i === 0) slide.classList.add('active');

      if (n.imagem) {
        slide.innerHTML = `<img src="${n.imagem}" alt="${n.alt || ''}">`;
      } else {
        slide.innerHTML = `<div>
          <strong style="display:block; font-size:1.25rem; margin-bottom:8px;">${n.titulo}</strong>
          <span>${n.texto}</span>
        </div>`;
      }
      inner.appendChild(slide);

      // Indicador
      const dot = document.createElement('div');
      dot.className = 'indicator' + (i === 0 ? ' active' : '');
      dot.addEventListener('click', () => {
        showSlide(i);
        resetAuto();
      });
      indicatorsBox.appendChild(dot);
    });

    const items = inner.querySelectorAll('.carousel-content');
    const indicators = indicatorsBox.querySelectorAll('.indicator');
    let currentIndex = 0;
    let interval = null;
    const DELAY = 5000;

    function showSlide(index) {
      index = (index + items.length) % items.length;
      items.forEach((it, i) => it.classList.toggle('active', i === index));
      indicators.forEach((dot, i) => dot.classList.toggle('active', i === index));
      currentIndex = index;
    }

    function nextSlide() { showSlide(currentIndex + 1); }
    function prevSlide() { showSlide(currentIndex - 1); }

    function startAuto() {
      stopAuto();
      interval = setInterval(nextSlide, DELAY);
    }

    function stopAuto() {
      if (interval) clearInterval(interval);
      interval = null;
    }

    function resetAuto() { startAuto(); }

    prevBtn.addEventListener('click', () => { prevSlide(); resetAuto(); });
    nextBtn.addEventListener('click', () => { nextSlide(); resetAuto(); });

    carousel.addEventListener('mouseenter', stopAuto);
    carousel.addEventListener('mouseleave', startAuto);

    carousel.tabIndex = 0;
    carousel.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { nextSlide(); resetAuto(); }
      if (e.key === 'ArrowLeft') { prevSlide(); resetAuto(); }
    });

    startAuto();




