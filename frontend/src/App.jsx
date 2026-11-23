import { useEffect, useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Link2,
  Trash2,
  Edit3,
  BarChart3,
  Vote,
  Sparkles,
  Fingerprint,
  Activity,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { votingApi } from "./api";

const CANDIDATES = [
  {
    name: "Candidat A",
    tag: "LISTA 01",
    desc: "Digitalizare și transparență administrativă.",
    color: "#3B82F6",
  },
  {
    name: "Candidat B",
    tag: "LISTA 02",
    desc: "Infrastructură universitară și cercetare aplicată.",
    color: "#22C55E",
  },
  {
    name: "Candidat C",
    tag: "LISTA 03",
    desc: "Parteneriate internaționale și mobilitate studențească.",
    color: "#F59E0B",
  },
];

const CHART_COLORS = ["#3B82F6", "#22C55E", "#F59E0B", "#A855F7", "#EF4444"];

const TABS = [
  { id: "vote", label: "Votare" },
  { id: "results", label: "Rezultate" },
  { id: "audit", label: "Audit & Atacuri" },
  { id: "benchmark", label: "Benchmark" },
];

// Calculează SHA-256 în format Base64 identic cu C# (Convert.ToBase64String)
async function computeSha256Base64(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(hashBuffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export default function App() {
  const [activeTab, setActiveTab] = useState("vote");
  const [audit, setAudit] = useState(null);
  const [results, setResults] = useState([]);
  const [chain, setChain] = useState([]);
  const [benchmark, setBenchmark] = useState([]);

  // Form states
  const [cnp, setCnp] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState("Candidat A");
  const [attackBlockId, setAttackBlockId] = useState("2");
  const [fakeCandidate, setFakeCandidate] = useState("Candidat C");

  // Simulator Efectul de Avalanșă (SHA-256)
  const [avalancheBase, setAvalancheBase] = useState("Candidat A");
  const [avalancheModified, setAvalancheModified] = useState("Candidat a");
  const [baseHash, setBaseHash] = useState("");
  const [modifiedHash, setModifiedHash] = useState("");

  // Contor fraude blocate/detectate + Jurnal de evenimente
  const [securityAlertsCount, setSecurityAlertsCount] = useState(0);
  const [eventLog, setEventLog] = useState([]);

  // UI states
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [benchLoading, setBenchLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const addLog = (type, message) => {
    const time = new Date().toLocaleTimeString("ro-RO", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setEventLog((prev) => [{ id: Date.now() + Math.random(), time, type, message }, ...prev.slice(0, 14)]);
  };

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 5000);
  };

  const refreshData = async () => {
    try {
      const [auditData, resultsData, chainData] = await Promise.all([
        votingApi.getAudit(),
        votingApi.getResults(),
        votingApi.getChain(),
      ]);
      setAudit(auditData);
      setResults(resultsData);
      setChain(chainData);
      return auditData;
    } catch {
      showToast("error", "API-ul C# nu răspunde pe localhost:5127. Pornește SecureVotingAPI.");
      return null;
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Recalculare live pentru Efectul de Avalanșă
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      computeSha256Base64(avalancheBase),
      computeSha256Base64(avalancheModified),
    ]).then(([h1, h2]) => {
      if (!cancelled) {
        setBaseHash(h1);
        setModifiedHash(h2);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [avalancheBase, avalancheModified]);

  const handleVote = async (e) => {
    e.preventDefault();
    if (!cnp.trim()) {
      showToast("error", "Introdu un CNP pentru validarea unicității.");
      return;
    }
    setLoading(true);
    try {
      const res = await votingApi.castVote(cnp.trim(), selectedCandidate);
      showToast("success", res.message);
      addLog("success", `Vot anonimizat înregistrat (${selectedCandidate}) — tranzacție COMMIT.`);
      setCnp("");
      await refreshData();
    } catch (err) {
      showToast("error", err.message);
      setSecurityAlertsCount((c) => c + 1);
      addLog("danger", `Vot duplicat respins de PostgreSQL (Rollback ACID) — CNP blocat.`);
    } finally {
      setLoading(false);
    }
  };

  const handlePopulateDemo = async () => {
    setDemoLoading(true);
    const stamp = Date.now().toString().slice(-5);
    const demoVotes = [
      { cnp: `1990101${stamp}1`, candidate: "Candidat A" },
      { cnp: `2980512${stamp}2`, candidate: "Candidat B" },
      { cnp: `5010923${stamp}3`, candidate: "Candidat A" },
      { cnp: `6021104${stamp}4`, candidate: "Candidat C" },
      { cnp: `1970718${stamp}5`, candidate: "Candidat B" },
    ];

    try {
      for (const item of demoVotes) {
        await votingApi.castVote(item.cnp, item.candidate);
      }
      showToast("success", "Au fost inserate 5 voturi distincte în lanț.");
      addLog("success", "Scenariu Demo: 5 voturi distincte criptate și adăugate în Hash Chain.");
      await refreshData();
    } catch (err) {
      showToast("error", err.message);
    } finally {
      setDemoLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      const res = await votingApi.resetDb();
      showToast("success", res.message);
      setBenchmark([]);
      setSecurityAlertsCount(0);
      setEventLog([]);
      addLog("info", "Baza de date a fost resetată la Genesis Block (#0).");
      await refreshData();
    } catch (err) {
      showToast("error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAttackUpdate = async () => {
    setLoading(true);
    try {
      const res = await votingApi.attackUpdate(attackBlockId, fakeCandidate);
      showToast("warning", res.message);
      addLog("warning", `Simulare SQL UPDATE executată pe Bloc #${attackBlockId}.`);
      const auditData = await refreshData();
      if (auditData && !auditData.isValid) {
        setSecurityAlertsCount((c) => c + 1);
        addLog("danger", `ALERTĂ AUDIT: ${auditData.message}`);
      }
    } catch (err) {
      showToast("error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAttackDelete = async () => {
    setLoading(true);
    try {
      const res = await votingApi.attackDelete(attackBlockId);
      showToast("warning", res.message);
      addLog("warning", `Simulare SQL DELETE executată pe Bloc #${attackBlockId}.`);
      const auditData = await refreshData();
      if (auditData && !auditData.isValid) {
        setSecurityAlertsCount((c) => c + 1);
        addLog("danger", `ALERTĂ AUDIT: ${auditData.message}`);
      }
    } catch (err) {
      showToast("error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBenchmark = async () => {
    setBenchLoading(true);
    try {
      const data = await votingApi.runBenchmark();
      setBenchmark(data);
      showToast("success", "Benchmark finalizat pentru 100 / 1.000 / 5.000 voturi.");
      const maxRun = data[data.length - 1];
      if (maxRun) {
        addLog(
          "info",
          `Benchmark 5.000 voturi: ${maxRun.votesPerSec} voturi/s, audit în ${maxRun.auditMs} ms.`
        );
      }
      await refreshData();
    } catch (err) {
      showToast("error", err.message);
    } finally {
      setBenchLoading(false);
    }
  };

  // Calcul procent caractere diferite pentru Efectul de Avalanșă
  const diffCount =
    baseHash && modifiedHash
      ? [...modifiedHash].filter((ch, i) => ch !== baseHash[i]).length
      : 0;
  const diffPercent =
    baseHash.length > 0 ? Math.round((diffCount / baseHash.length) * 100) : 0;

  const totalVotes = audit?.totalVotes ?? 0;
  const isChainValid = audit?.isValid ?? true;
  const visibleChain = chain.length > 50 ? [chain[0], ...chain.slice(-25)] : chain;

  return (
    <div className="min-h-screen bg-[#0B0B0D] text-white px-4 py-6 md:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1C1C20] border border-[#2A2A2F] flex items-center justify-center">
              <Vote className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold tracking-tight">SecureVoting</h1>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border border-[#2E2E34] text-[#9A9AA0]">
                  SHA-256
                </span>
              </div>
              <p className="text-xs text-[#8E8E93]">
                Sistem Local de Votare Electronic Securizat • PostgreSQL
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Lanț */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
                isChainValid
                  ? "bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]"
                  : "bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isChainValid ? "bg-[#22C55E]" : "bg-[#EF4444] animate-pulse"
                }`}
              />
              {isChainValid ? "Lanț Intact" : "Fraudă Detectată"}
            </div>

            {/* Contor Tentative / Fraude Blocate */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                securityAlertsCount > 0
                  ? "bg-[#EF4444]/10 border-[#EF4444]/30 text-[#F87171]"
                  : "bg-[#161619] border-[#26262A] text-[#8E8E93]"
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Fraude blocate/detectate: {securityAlertsCount}</span>
            </div>

            {/* Populează Demo 1-Click */}
            <button
              onClick={handlePopulateDemo}
              disabled={demoLoading || loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#3B82F6]/15 hover:bg-[#3B82F6]/25 border border-[#3B82F6]/40 text-xs font-medium text-[#60A5FA] transition cursor-pointer disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${demoLoading ? "animate-spin" : ""}`} />
              {demoLoading ? "Se adaugă..." : "Populează Demo (5 voturi)"}
            </button>

            {/* Reset DB */}
            <button
              onClick={handleReset}
              disabled={loading}
              title="Resetează baza de date"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#161619] hover:bg-[#222227] border border-[#26262A] text-xs text-[#C7C7CC] transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Reset DB
            </button>
          </div>
        </header>

        {/* Pill Tabs Navigation */}
        <nav className="flex items-center gap-2 overflow-x-auto pb-1">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap cursor-pointer ${
                  active
                    ? "bg-white text-black"
                    : "bg-[#161619] text-[#A1A1AA] border border-[#26262A] hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Feedback Toast */}
        {toast && (
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm ${
              toast.type === "success"
                ? "bg-[#22C55E]/10 border-[#22C55E]/30 text-[#4ADE80]"
                : toast.type === "warning"
                ? "bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#FBBF24]"
                : "bg-[#EF4444]/10 border-[#EF4444]/30 text-[#F87171]"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{toast.text}</span>
          </div>
        )}

        {/* TAB 1: VOTARE */}
        {activeTab === "vote" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form onSubmit={handleVote} className="lg:col-span-7 space-y-5">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">
                  Alege opțiunea de vot
                </h2>
                <p className="text-sm text-[#8E8E93] mt-1">
                  Votul tău este criptat și decuplat complet de identitate.
                </p>
              </div>

              <div className="space-y-3">
                {CANDIDATES.map((cand) => {
                  const isSelected = selectedCandidate === cand.name;
                  return (
                    <button
                      type="button"
                      key={cand.name}
                      onClick={() => setSelectedCandidate(cand.name)}
                      className={`w-full text-left p-4 rounded-2xl border transition cursor-pointer ${
                        isSelected
                          ? "bg-[#161619] border-[#22C55E]"
                          : "bg-[#161619] border-[#26262A] hover:border-[#3A3A42]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: cand.color }}
                          />
                          <span className="font-semibold text-base">{cand.name}</span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full border border-[#2E2E34] text-[#8E8E93]">
                            {cand.tag}
                          </span>
                        </div>
                        {isSelected && (
                          <span className="text-xs font-medium text-[#22C55E]">Selectat</span>
                        )}
                      </div>
                      <p className="text-xs text-[#8E8E93] mt-2 pl-5">{cand.desc}</p>
                    </button>
                  );
                })}
              </div>

              <div className="bg-[#161619] border border-[#26262A] rounded-2xl p-4 space-y-2">
                <label className="block text-xs font-medium text-[#8E8E93]">
                  CNP Alegător (utilizat strict pentru prevenirea votului multiplu)
                </label>
                <input
                  type="text"
                  value={cnp}
                  onChange={(e) => setCnp(e.target.value)}
                  placeholder="ex: 1990101123456"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                  className="w-full bg-[#0B0B0D] border border-[#2A2A30] focus:border-white rounded-xl px-3.5 py-2.5 text-sm text-white outline-none transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-white hover:bg-[#E5E5EA] text-black font-semibold text-sm transition cursor-pointer disabled:opacity-50"
              >
                {loading
                  ? "Se procesează tranzacția..."
                  : `Confirmă votul pentru ${selectedCandidate}`}
              </button>
            </form>

            {/* Info Panel */}
            <div className="lg:col-span-5 bg-[#161619] border border-[#26262A] rounded-2xl p-6 space-y-6 h-fit">
              <h3 className="text-xl font-semibold tracking-tight">
                Garanții de securitate
              </h3>

              <div className="space-y-5">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#222227] flex items-center justify-center shrink-0">
                    <Lock className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">Anonimizare ireversibilă (GDPR)</h4>
                    <p className="text-xs text-[#8E8E93] mt-1 leading-relaxed">
                      CNP-ul nu este stocat niciodată în clar. Se salvează doar hash-ul SHA-256 + Salt în tabela separată{" "}
                      <code className="text-[#C7C7CC]">voter_records</code>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#222227] flex items-center justify-center shrink-0">
                    <Database className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">Tranzacții ACID în PostgreSQL</h4>
                    <p className="text-xs text-[#8E8E93] mt-1 leading-relaxed">
                      Cheia primară blochează automat votul multiplu la nivel de bază de date, executând Rollback instant la orice tentativă duplicată.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#222227] flex items-center justify-center shrink-0">
                    <Link2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">Înlănțuire criptografică (Hash Chain)</h4>
                    <p className="text-xs text-[#8E8E93] mt-1 leading-relaxed">
                      Fiecare vot include amprenta blocului anterior. Orice modificare sau ștergere directă din DB rupe lanțul și este detectată imediat.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: REZULTATE */}
        {activeTab === "results" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Donut Card */}
              <div className="lg:col-span-5 bg-[#161619] border border-[#26262A] rounded-2xl p-6 flex flex-col items-center justify-center">
                <div className="w-full flex items-center justify-between mb-2">
                  <span className="text-sm text-[#8E8E93]">Distribuție voturi</span>
                  <span className="text-xs text-[#8E8E93]">Live DB</span>
                </div>

                <div className="relative w-full h-60">
                  {results.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={results}
                          dataKey="voteCount"
                          nameKey="candidateName"
                          innerRadius={72}
                          outerRadius={92}
                          paddingAngle={4}
                          stroke="none"
                        >
                          {results.map((_, idx) => (
                            <Cell
                              key={idx}
                              fill={CHART_COLORS[idx % CHART_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1C1C20",
                            border: "1px solid #2A2A30",
                            borderRadius: "12px",
                            fontSize: "12px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm text-[#8E8E93]">
                      Nu există voturi înregistrate încă.
                    </div>
                  )}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xs text-[#8E8E93]">Total voturi</span>
                    <span className="text-3xl font-semibold mt-0.5">
                      {totalVotes.toLocaleString("ro-RO")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Candidate Breakdown & Key Metrics */}
              <div className="lg:col-span-7 space-y-4">
                <div className="bg-[#161619] border border-[#26262A] rounded-2xl p-5 space-y-3">
                  <h3 className="text-base font-semibold">Clasament Candidați</h3>
                  {results.length === 0 ? (
                    <p className="text-sm text-[#8E8E93]">
                      Apasă „Populează Demo (5 voturi)” din header sau votează manual.
                    </p>
                  ) : (
                    <div className="divide-y divide-[#26262A]">
                      {results.map((item, idx) => {
                        const pct =
                          totalVotes > 0
                            ? ((item.voteCount / totalVotes) * 100).toFixed(1)
                            : "0.0";
                        return (
                          <div
                            key={item.candidateName}
                            className="py-3 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className="w-1 h-8 rounded-full"
                                style={{
                                  backgroundColor:
                                    CHART_COLORS[idx % CHART_COLORS.length],
                                }}
                              />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">
                                    {item.candidateName}
                                  </span>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#2E2E34] text-[#8E8E93]">
                                    CANDIDAT
                                  </span>
                                </div>
                                <span className="text-xs text-[#8E8E93]">
                                  Pondere: {pct}%
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-sm">
                                {item.voteCount.toLocaleString("ro-RO")}
                              </div>
                              <div className="text-xs text-[#22C55E]">voturi</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2-Column Financial Style Metrics Grid */}
                <div className="bg-[#161619] border border-[#26262A] rounded-2xl p-5 grid grid-cols-2 gap-y-4 gap-x-6">
                  <div className="border-b border-[#26262A] pb-3">
                    <span className="text-xs text-[#8E8E93]">Status Integritate</span>
                    <p
                      className={`text-lg font-semibold mt-0.5 ${
                        isChainValid ? "text-[#22C55E]" : "text-[#EF4444]"
                      }`}
                    >
                      {isChainValid ? "Valid (100%)" : "Compromis"}
                    </p>
                  </div>
                  <div className="border-b border-[#26262A] pb-3">
                    <span className="text-xs text-[#8E8E93]">Blocuri în Lanț</span>
                    <p className="text-lg font-semibold mt-0.5">
                      {chain.length.toLocaleString("ro-RO")}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-[#8E8E93]">Tentative Fraude Blocate</span>
                    <p className="text-lg font-semibold mt-0.5 text-[#F87171]">
                      {securityAlertsCount}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-[#8E8E93]">Complexitate Audit</span>
                    <p className="text-lg font-semibold mt-0.5">O(N) Liniar</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: AUDIT & ATACURI */}
        {activeTab === "audit" && (
          <div className="space-y-6">
            {/* Audit Banner */}
            <div
              className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                isChainValid
                  ? "bg-[#161619] border-[#22C55E]/40"
                  : "bg-[#EF4444]/10 border-[#EF4444]/50"
              }`}
            >
              <div className="flex items-start gap-3.5">
                {isChainValid ? (
                  <ShieldCheck className="w-7 h-7 text-[#22C55E] shrink-0 mt-0.5" />
                ) : (
                  <ShieldAlert className="w-7 h-7 text-[#EF4444] shrink-0 mt-0.5" />
                )}
                <div>
                  <h3 className="font-semibold text-base">
                    {isChainValid ? "Audit Criptografic Confirmat" : "Alertă de Securitate"}
                  </h3>
                  <p className="text-sm text-[#A1A1AA] mt-0.5">
                    {audit?.message || "Se încarcă statusul..."}
                  </p>
                </div>
              </div>
              <button
                onClick={refreshData}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#E5E5EA] text-black text-xs font-semibold transition shrink-0 cursor-pointer"
              >
                Reverifică Lanțul
              </button>
            </div>

            {/* Simulator Efectul de Avalanșă (SHA-256 Live) */}
            <div className="bg-[#161619] border border-[#26262A] rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#222227] flex items-center justify-center">
                    <Fingerprint className="w-4 h-4 text-[#60A5FA]" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">
                      Simulator „Efectul de Avalanșă” (SHA-256 Live)
                    </h3>
                    <p className="text-xs text-[#8E8E93]">
                      Schimbă o singură literă mai jos și observă cum întreaga amprentă criptografică se transformă.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-medium px-3 py-1 rounded-full bg-[#3B82F6]/15 border border-[#3B82F6]/30 text-[#60A5FA] w-fit">
                  {diffPercent}% din hash modificat
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#0B0B0D] border border-[#26262A] rounded-xl p-3.5 space-y-2">
                  <label className="block text-[11px] uppercase tracking-wider text-[#8E8E93]">
                    Date originale
                  </label>
                  <input
                    type="text"
                    value={avalancheBase}
                    onChange={(e) => setAvalancheBase(e.target.value)}
                    className="w-full bg-[#161619] border border-[#2A2A30] focus:border-white rounded-lg px-3 py-1.5 text-sm outline-none"
                  />
                  <div
                    className="text-xs text-[#4ADE80] break-all pt-1"
                    style={{ fontFamily: "'Space Mono', monospace" }}
                  >
                    {baseHash}
                  </div>
                </div>

                <div className="bg-[#0B0B0D] border border-[#26262A] rounded-xl p-3.5 space-y-2">
                  <label className="block text-[11px] uppercase tracking-wider text-[#8E8E93]">
                    Date alterate (testează modificarea unui caracter)
                  </label>
                  <input
                    type="text"
                    value={avalancheModified}
                    onChange={(e) => setAvalancheModified(e.target.value)}
                    className="w-full bg-[#161619] border border-[#2A2A30] focus:border-white rounded-lg px-3 py-1.5 text-sm outline-none"
                  />
                  <div
                    className="text-xs break-all pt-1"
                    style={{ fontFamily: "'Space Mono', monospace" }}
                  >
                    {[...modifiedHash].map((char, idx) => (
                      <span
                        key={idx}
                        className={
                          char !== baseHash[idx] ? "text-[#F87171] font-bold" : "text-[#4ADE80]"
                        }
                      >
                        {char}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Attack Simulator */}
            <div className="bg-[#161619] border border-[#26262A] rounded-2xl p-5 space-y-4">
              <div>
                <h3 className="text-base font-semibold">Simulare Atac Direct în PostgreSQL</h3>
                <p className="text-xs text-[#8E8E93] mt-0.5">
                  Testează reacția sistemului la un atacator intern cu acces SQL direct pe tabela{" "}
                  <code className="text-[#C7C7CC]">vote_chain</code>.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-[#8E8E93] mb-1">Block ID țintă</label>
                  <input
                    type="number"
                    min="1"
                    value={attackBlockId}
                    onChange={(e) => setAttackBlockId(e.target.value)}
                    className="w-full bg-[#0B0B0D] border border-[#2A2A30] rounded-xl px-3 py-2 text-sm outline-none focus:border-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#8E8E93] mb-1">
                    Candidat fals (pentru UPDATE)
                  </label>
                  <select
                    value={fakeCandidate}
                    onChange={(e) => setFakeCandidate(e.target.value)}
                    className="w-full bg-[#0B0B0D] border border-[#2A2A30] rounded-xl px-3 py-2 text-sm outline-none focus:border-white"
                  >
                    {CANDIDATES.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  <button
                    onClick={handleAttackUpdate}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#F59E0B]/15 hover:bg-[#F59E0B]/25 border border-[#F59E0B]/40 text-[#FBBF24] text-xs font-semibold transition cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Atac UPDATE
                  </button>
                  <button
                    onClick={handleAttackDelete}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#EF4444]/15 hover:bg-[#EF4444]/25 border border-[#EF4444]/40 text-[#F87171] text-xs font-semibold transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Atac DELETE
                  </button>
                </div>
              </div>
            </div>

            {/* Hash Chain Explorer */}
            <div className="bg-[#161619] border border-[#26262A] rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">Hash Chain Explorer</h3>
                <span className="text-xs text-[#8E8E93]">
                  {chain.length > 50
                    ? `Se afișează Genesis + ultimele 25 din ${chain.length} blocuri`
                    : `${chain.length} blocuri în DB`}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#26262A] text-[11px] uppercase text-[#8E8E93]">
                      <th className="py-2.5 pr-4">Bloc</th>
                      <th className="py-2.5 pr-4">Opțiune</th>
                      <th className="py-2.5 pr-4">Previous Hash</th>
                      <th className="py-2.5 pr-4">Block Hash</th>
                      <th className="py-2.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222227] text-xs">
                    {visibleChain.map((b) => {
                      const isCompromised = audit?.compromisedBlockId === b.blockId;
                      return (
                        <tr
                          key={b.blockId}
                          className={isCompromised ? "bg-[#EF4444]/15" : ""}
                        >
                          <td className="py-3 pr-4 font-semibold">
                            {b.blockId === 0 ? "GENESIS" : `#${b.blockId}`}
                          </td>
                          <td className="py-3 pr-4">{b.candidateName}</td>
                          <td
                            className="py-3 pr-4 text-[#8E8E93]"
                            style={{ fontFamily: "'Space Mono', monospace" }}
                          >
                            {b.previousHash.slice(0, 14)}...
                          </td>
                          <td
                            className="py-3 pr-4 text-[#C7C7CC]"
                            style={{ fontFamily: "'Space Mono', monospace" }}
                          >
                            {b.blockHash.slice(0, 14)}...
                          </td>
                          <td className="py-3 text-right">
                            {isCompromised ? (
                              <span className="px-2 py-0.5 rounded-full bg-[#EF4444]/20 text-[#F87171] font-medium">
                                COMPROMIS
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-[#22C55E]/15 text-[#4ADE80] font-medium">
                                VALID
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: BENCHMARK */}
        {activeTab === "benchmark" && (
          <div className="space-y-6">
            <div className="bg-[#161619] border border-[#26262A] rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Benchmark Performanță & Scalare</h2>
                <p className="text-xs text-[#8E8E93] mt-1">
                  Rulează tranzacții ACID reale în PostgreSQL pentru 100, 1.000 și 5.000 de voturi și măsoară viteza de auditare.
                </p>
              </div>
              <button
                onClick={handleBenchmark}
                disabled={benchLoading}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white hover:bg-[#E5E5EA] text-black text-sm font-semibold transition shrink-0 cursor-pointer disabled:opacity-50"
              >
                <Zap className={`w-4 h-4 ${benchLoading ? "animate-pulse" : ""}`} />
                {benchLoading ? "Se rulează testele..." : "Rulează Benchmark"}
              </button>
            </div>

            {benchmark.length > 0 ? (
              <>
                <div className="bg-[#161619] border border-[#26262A] rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-[#60A5FA]" />
                      <h3 className="text-base font-semibold">
                        Timp Inserare vs. Timp Audit (ms)
                      </h3>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[#8E8E93]">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#93C5FD]" />
                        Inserare (ms)
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
                        Audit (ms)
                      </span>
                    </div>
                  </div>

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={benchmark} barGap={6}>
                        <CartesianGrid stroke="#222227" vertical={false} />
                        <XAxis
                          dataKey="voteCount"
                          stroke="#8E8E93"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `${v} voturi`}
                        />
                        <YAxis
                          stroke="#8E8E93"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `${v}ms`}
                        />
                        <Tooltip
                          cursor={{ fill: "#1F1F24" }}
                          contentStyle={{
                            backgroundColor: "#1C1C20",
                            border: "1px solid #2A2A30",
                            borderRadius: "12px",
                            fontSize: "12px",
                          }}
                        />
                        <Bar
                          dataKey="insertMs"
                          name="Inserare (ms)"
                          fill="#93C5FD"
                          radius={[8, 8, 0, 0]}
                          barSize={26}
                        />
                        <Bar
                          dataKey="auditMs"
                          name="Audit (ms)"
                          fill="#3B82F6"
                          radius={[8, 8, 0, 0]}
                          barSize={26}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-[#161619] border border-[#26262A] rounded-2xl p-5 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#26262A] text-xs text-[#8E8E93]">
                        <th className="py-2.5 pr-4">Volum</th>
                        <th className="py-2.5 pr-4">Timp Inserare</th>
                        <th className="py-2.5 pr-4">Medie / Vot</th>
                        <th className="py-2.5 pr-4">Throughput</th>
                        <th className="py-2.5 pr-4">Timp Audit</th>
                        <th className="py-2.5 text-right">Integritate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#222227]">
                      {benchmark.map((row) => (
                        <tr key={row.voteCount}>
                          <td className="py-3 pr-4 font-semibold">
                            {row.voteCount.toLocaleString("ro-RO")} voturi
                          </td>
                          <td className="py-3 pr-4">{row.insertMs} ms</td>
                          <td className="py-3 pr-4">{row.avgMsPerVote} ms</td>
                          <td className="py-3 pr-4 text-[#60A5FA] font-medium">
                            {row.votesPerSec} voturi/s
                          </td>
                          <td className="py-3 pr-4">{row.auditMs} ms</td>
                          <td className="py-3 text-right text-[#22C55E] font-medium">
                            {row.isValid ? "Valid" : "Eroare"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="bg-[#161619] border border-[#26262A] rounded-2xl p-10 text-center text-sm text-[#8E8E93]">
                Apasă <span className="text-white font-medium">Rulează Benchmark</span> pentru a genera graficul și datele de performanță în timp real.
              </div>
            )}
          </div>
        )}

        {/* Jurnal Cronologic de Securitate & Evenimente (mereu vizibil) */}
        <section className="bg-[#161619] border border-[#26262A] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#8E8E93]" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93]">
                Jurnal de Evenimente & Securitate (Live)
              </h3>
            </div>
            <span className="text-xs text-[#8E8E93]">
              {eventLog.length} {eventLog.length === 1 ? "eveniment" : "evenimente"}
            </span>
          </div>

          {eventLog.length === 0 ? (
            <p className="text-xs text-[#6E6E73]">
              Acțiunile (voturi, tentative respinse, simulări de atac, audit) vor apărea cronologic aici.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {eventLog.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-2.5 text-xs py-1 border-b border-[#222227] last:border-none"
                >
                  <span
                    className="text-[#6E6E73] shrink-0"
                    style={{ fontFamily: "'Space Mono', monospace" }}
                  >
                    [{entry.time}]
                  </span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      entry.type === "danger"
                        ? "bg-[#EF4444]"
                        : entry.type === "warning"
                        ? "bg-[#F59E0B]"
                        : entry.type === "success"
                        ? "bg-[#22C55E]"
                        : "bg-[#60A5FA]"
                    }`}
                  />
                  <span
                    className={
                      entry.type === "danger"
                        ? "text-[#F87171] font-medium"
                        : entry.type === "warning"
                        ? "text-[#FBBF24]"
                        : "text-[#D1D1D6]"
                    }
                  >
                    {entry.message}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}