const out = document.getElementById("out");
const keyInput = document.getElementById("adminKey");
const saveKeyBtn = document.getElementById("saveKey");
const showRawBtn = document.getElementById("showRaw");
const showCountedBtn = document.getElementById("showCounted");

function getKey() {
  return localStorage.getItem("ADMIN_KEY") || "";
}

function setKey(k) {
  localStorage.setItem("ADMIN_KEY", k);
}

function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") el.className = v;
    else el.setAttribute(k, v);
  }
  for (const c of children) {
    if (typeof c === "string") el.appendChild(document.createTextNode(c));
    else el.appendChild(c);
  }
  return el;
}

async function adminFetch(url) {
  const key = getKey();
  if (!key) throw new Error("Admin key not set.");
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${key}` }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function renderRaw(data) {
  out.innerHTML = "";
  out.appendChild(h("div", {}, [
    h("p", {}, [`Total ballots: ${data.totalBallots}`]),
    h("p", {}, [`Seats: ${data.seats} | Ranks required: ${data.ranksRequired}`])
  ]));

  const tbl = h("table");
  const thead = h("thead");
  const headerRow = h("tr");
  headerRow.appendChild(h("th", {}, ["#"]));
  for (let i = 1; i <= data.ranksRequired; i++) {
    headerRow.appendChild(h("th", {}, ["Rank " + i]));
  }
  thead.appendChild(headerRow);
  tbl.appendChild(thead);

  const tbody = h("tbody");
  (data.votes || []).forEach((ballot, idx) => {
    const tr = h("tr");
    tr.appendChild(h("td", {}, [String(idx + 1)]));
    ballot.forEach(c => tr.appendChild(h("td", {}, [c])));
    tbody.appendChild(tr);
  });
  tbl.appendChild(tbody);
  out.appendChild(tbl);
}

function renderCounted(data) {
  out.innerHTML = "";
  out.appendChild(h("p", {}, [
    `Method: ${data.method} | Seats: ${data.seats} | Quota: ${data.quota} | Ballots: ${data.totalBallots}`
  ]));

  // Winners
  out.appendChild(h("h3", {}, ["Winners"]));
  const ul = h("ul");
  (data.winners || []).forEach(w => ul.appendChild(h("li", {}, [w])));
  out.appendChild(ul);

  // Rounds table
  out.appendChild(h("h3", {}, ["Rounds"]));
  const tbl = h("table");
  const thead = h("thead");
  const headerRow = h("tr");
  headerRow.appendChild(h("th", {}, ["Round"]));
  headerRow.appendChild(h("th", {}, ["Elected"]));
  headerRow.appendChild(h("th", {}, ["Eliminated"]));
  headerRow.appendChild(h("th", {}, ["Tallies (active only)"]));
  thead.appendChild(headerRow);
  tbl.appendChild(thead);

  const tbody = h("tbody");
  (data.rounds || []).forEach(r => {
    const tr = h("tr");
    tr.appendChild(h("td", {}, [String(r.round)]));
    tr.appendChild(h("td", {}, [r.elected && r.elected.length ? r.elected.join(", ") : "—"]));
    tr.appendChild(h("td", {}, [r.eliminated && r.eliminated.length ? r.eliminated.join(", ") : "—"]));
    tr.appendChild(h("td", {}, [JSON.stringify(r.tallies)]));
    tbody.appendChild(tr);
  });
  tbl.appendChild(tbody);
  out.appendChild(tbl);
}

saveKeyBtn.addEventListener("click", () => {
  const k = keyInput.value.trim();
  if (!k) { alert("Enter an admin key"); return; }
  setKey(k);
  alert("Key saved in your browser.");
});

showRawBtn.addEventListener("click", async () => {
  try {
    const data = await adminFetch("/api/results?mode=raw");
    renderRaw(data);
  } catch (e) {
    out.textContent = "❌ " + e.message;
  }
});

showCountedBtn.addEventListener("click", async () => {
  try {
    const data = await adminFetch("/api/results?mode=counted");
    renderCounted(data);
  } catch (e) {
    out.textContent = "❌ " + e.message;
  }
});

// Prefill key if stored
keyInput.value = getKey();

