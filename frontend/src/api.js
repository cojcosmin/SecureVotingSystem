const API_BASE = "http://localhost:5127/api";

async function request(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Eroare la comunicarea cu serverul.");
  }
  return data;
}

export const votingApi = {
  castVote: (cnp, candidate) =>
    request("/votes", {
      method: "POST",
      body: JSON.stringify({ cnp, candidate }),
    }),
  getChain: () => request("/votes/chain"),
  getResults: () => request("/votes/results"),
  getAudit: () => request("/audit"),
  attackUpdate: (blockId, fakeCandidate) =>
    request("/attacks/update", {
      method: "POST",
      body: JSON.stringify({ blockId: Number(blockId), fakeCandidate }),
    }),
  attackDelete: (blockId) =>
    request("/attacks/delete", {
      method: "POST",
      body: JSON.stringify({ blockId: Number(blockId) }),
    }),
  runBenchmark: () => request("/benchmark", { method: "POST" }),
  resetDb: () => request("/reset", { method: "POST" }),
};