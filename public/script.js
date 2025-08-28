const form = document.getElementById("votingForm");
const container = document.getElementById("rankingContainer");
const numRanks = 14;

async function loadCandidates() {
  const res = await fetch("/api/candidates");
  const candidates = await res.json();

  for (let i = 1; i <= numRanks; i++) {
    const div = document.createElement("div");
    div.className = "rank-select";
    div.innerHTML = `
      <label for="rank${i}">Rank ${i}:</label>
      <select name="rank${i}" id="rank${i}" required>
        <option value="">-- Select candidate --</option>
        ${candidates.map(c => `<option value="${c}">${c}</option>`).join("")}
      </select>
    `;
    container.appendChild(div);
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const token = form.elements["token"].value.trim();
  const ballot = [];

  for (let i = 1; i <= numRanks; i++) {
    const val = form.elements[`rank${i}`].value;
    if (!val) {
      alert("You must rank exactly 14 candidates.");
      return;
    }
    ballot.push(val);
  }

  const unique = new Set(ballot);
  if (unique.size !== ballot.length) {
    alert("No duplicates allowed in your ballot.");
    return;
  }

  const res = await fetch("/api/vote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ballot, token })
  });

  const data = await res.json();
  if (data.error) {
    alert("Error: " + data.error);
  } else {
    alert("Vote submitted successfully!");
    form.reset();
  }
});

loadCandidates();

