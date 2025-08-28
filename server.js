const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 3000;

// Secret admin password
const ADMIN_PASSWORD = "supersecret";

// File paths
const votesFile = path.join(__dirname, "data", "votes.json");
const candidatesFile = path.join(__dirname, "data", "candidates.json");
const tokensFile = path.join(__dirname, "data", "tokens.json");

// Middleware
app.use(bodyParser.json());
app.use(express.static("public"));

// Helper: read/write JSON
function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// API: Get candidates
app.get("/api/candidates", (req, res) => {
  const candidates = readJSON(candidatesFile);
  res.json(candidates);
});

// API: Submit vote (requires token)
app.post("/api/vote", (req, res) => {
  const { ballot, token } = req.body;

  if (!ballot || !token || !Array.isArray(ballot) || ballot.length !== 14) {
    return res.status(400).json({ error: "Invalid ballot or token" });
  }

  let tokens = readJSON(tokensFile);
  const tokenEntry = tokens.find(t => t.token === token);

  if (!tokenEntry) {
    return res.status(403).json({ error: "Invalid token" });
  }
  if (tokenEntry.used) {
    return res.status(403).json({ error: "Token already used" });
  }

  // Validate no duplicates
  const unique = new Set(ballot);
  if (unique.size !== ballot.length) {
    return res.status(400).json({ error: "Duplicate candidates not allowed" });
  }

  // Save vote
  let votes = readJSON(votesFile);
  votes.push({ ballot, timestamp: Date.now() });
  writeJSON(votesFile, votes);

  // Mark token as used
  tokenEntry.used = true;
  writeJSON(tokensFile, tokens);

  res.json({ message: "Vote submitted successfully" });
});

// API: Admin view raw votes
app.get("/api/raw-votes", (req, res) => {
  if (req.query.admin !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: "Unauthorized" });
  }
  res.json(readJSON(votesFile));
});

// API: Admin view results (Ranked Choice Voting, 14 winners)
app.get("/api/results", (req, res) => {
  if (req.query.admin !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const candidates = readJSON(candidatesFile);
  const votes = readJSON(votesFile);

  let elected = [];
  let eliminated = [];

  function countFirstChoices() {
    const tally = {};
    for (const c of candidates) {
      if (!eliminated.includes(c) && !elected.includes(c)) {
        tally[c] = 0;
      }
    }
    for (const v of votes) {
      for (const choice of v.ballot) {
        if (!eliminated.includes(choice) && !elected.includes(choice)) {
          tally[choice]++;
          break;
        }
      }
    }
    return tally;
  }

  while (elected.length < 14 && elected.length + eliminated.length < candidates.length) {
    const tally = countFirstChoices();
    const entries = Object.entries(tally);
    if (entries.length === 0) break;

    const [topCandidate, topVotes] = entries.reduce((a, b) => (a[1] > b[1] ? a : b));
    const [bottomCandidate, bottomVotes] = entries.reduce((a, b) => (a[1] < b[1] ? a : b));

    elected.push(topCandidate);
    eliminated.push(bottomCandidate);
  }

  res.json({ winners: elected.slice(0, 14) });
});

// API: Admin generate new tokens
app.post("/api/generate-tokens", (req, res) => {
  if (req.body.admin !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const { count } = req.body;
  if (!count || count <= 0) {
    return res.status(400).json({ error: "Invalid count" });
  }

  let tokens = readJSON(tokensFile);
  for (let i = 0; i < count; i++) {
    tokens.push({ token: uuidv4(), used: false });
  }
  writeJSON(tokensFile, tokens);

  res.json({ message: "Tokens generated", tokens });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

