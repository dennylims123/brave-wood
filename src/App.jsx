import React, { useState, useMemo, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  FileWarning,
  Paperclip,
  Leaf,
  Users,
  Route,
  ClipboardCheck,
  Award,
  Factory,
  FileCheck2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Search,
  Inbox,
} from "lucide-react";
import Papa from "papaparse";

// =========================================================================
// PARSE — turn a raw sheet row into a structured supplier record
// =========================================================================

const SECTION_DEFS = [
  { key: "info", label: "Informasi Supplier", icon: Factory, weight: 0.05 },
  {
    key: "sustain",
    label: "Sustainability & NDPE Policy",
    icon: FileCheck2,
    weight: 0.15,
  },
  { key: "enviro", label: "Lingkungan & Kebun Inti", icon: Leaf, weight: 0.2 },
  { key: "social", label: "Sosial, TK, Etik", icon: Users, weight: 0.15 },
  { key: "trace", label: "Traceability", icon: Route, weight: 0.18 },
  {
    key: "ndpe",
    label: "Implementasi NDPE",
    icon: ClipboardCheck,
    weight: 0.2,
  },
  { key: "cert", label: "Sertifikasi", icon: Award, weight: 0.07 },
];

const EVIDENCE_REF = {
  q12_kebijakanSustainability: "ev_q13",
  q14_kodeEtikPermata: "ev_q15",
  q16_kebijakanNDPE: "ev_q17",
  q18_sosialisasiNDPE: "ev_q19",
  q22_kebijakanLingkungan: "ev_q23",
  q28_penilaianHCVHCS: "ev_q29",
  q34_kebijakanSosial: "ev_q35",
  q36_kebijakanEtik: "ev_q37",
  q38_sosialisasiSosial: "ev_q39",
  q42_programCSR: "ev_q43",
  q48_rencanaAksiNDPE: "ev_q49",
};

const FIELD_LABELS = {
  q12_kebijakanSustainability: "Q12 Kebijakan Sustainability",
  q14_kodeEtikPermata: "Q14 Kode Etik Permata Group",
  q16_kebijakanNDPE: "Q16 Kebijakan NDPE",
  q18_sosialisasiNDPE: "Q18 Sosialisasi NDPE internal",
  q20_kunjunganAudit: "Q20 Kunjungan / audit NDPE",
  q22_kebijakanLingkungan: "Q22 Kebijakan Lingkungan",
  q24_cakupanLingkungan: "Q24 Cakupan kebijakan lingkungan",
  q25_kebunInti: "Q25 Memiliki Kebun Inti",
  q26_tahunTanam: "Q26 Tahun tanam",
  q28_penilaianHCVHCS: "Q28 Penilaian HCV HCS",
  q30_sistemPemantauan: "Q30 Sistem pemantauan",
  q31_soilAssessment: "Q31 Soil Assessment",
  q32_lahanGambut: "Q32 Lahan gambut di konsesi",
  q33_bmpGambut: "Q33 BMP gambut",
  q34_kebijakanSosial: "Q34 Kebijakan Sosial & TK",
  q36_kebijakanEtik: "Q36 Kebijakan Etik",
  q38_sosialisasiSosial: "Q38 Sosialisasi kebijakan sosial",
  q40_cakupanSosial: "Q40 Cakupan poin sosial",
  q41_permasalahanSosial: "Q41 Permasalahan sosial (1 thn)",
  q42_programCSR: "Q42 Program CSR",
  q44_sistemTraceability: "Q44 Sistem Traceability",
  q45_tingkatTraceability: "Q45 Tingkat Traceability",
  q46_shpFilePolygon: "Q46 SHP File polygon tersedia",
  q48_rencanaAksiNDPE: "Q48 Rencana aksi NDPE",
  q50_dueDiligence: "Q50 Due diligence supplier baru",
  q51_cakupanNDPE: "Q51 Cakupan implementasi NDPE",
  q52_laranganNKT: "Q52 Larangan terima buah NKT/SKT",
};

const SECTION_FIELDS = {
  sustain: [
    "q12_kebijakanSustainability",
    "q14_kodeEtikPermata",
    "q16_kebijakanNDPE",
    "q18_sosialisasiNDPE",
    "q20_kunjunganAudit",
  ],
  enviro: [
    "q22_kebijakanLingkungan",
    "q24_cakupanLingkungan",
    "q25_kebunInti",
    "q28_penilaianHCVHCS",
    "q30_sistemPemantauan",
    "q31_soilAssessment",
    "q32_lahanGambut",
    "q33_bmpGambut",
  ],
  social: [
    "q34_kebijakanSosial",
    "q36_kebijakanEtik",
    "q38_sosialisasiSosial",
    "q40_cakupanSosial",
    "q41_permasalahanSosial",
    "q42_programCSR",
  ],
  trace: [
    "q44_sistemTraceability",
    "q45_tingkatTraceability",
    "q46_shpFilePolygon",
  ],
  ndpe: [
    "q48_rencanaAksiNDPE",
    "q50_dueDiligence",
    "q51_cakupanNDPE",
    "q52_laranganNKT",
  ],
};

const NEGATIVE_VALUES = new Set([
  "tidak",
  "belum",
  "tidak pernah",
  "tidak ada",
  "",
]);
const MULTI_VALUE_FIELDS = new Set([
  "q24_cakupanLingkungan",
  "q40_cakupanSosial",
  "q51_cakupanNDPE",
]);

function hasEvidence(row, fieldKey) {
  const ref = EVIDENCE_REF[fieldKey];
  if (!ref) return null;
  try {
    const files = JSON.parse(row.uploadedFiles || "{}");
    return Array.isArray(files[ref]) && files[ref].length > 0;
  } catch {
    return false;
  }
}

function scoreField(row, fieldKey) {
  const raw = (row[fieldKey] || "").trim();
  if (!raw) return null;

  // Q41 is phrased as "were there social problems in the last year" — this
  // is an inverted question where "Tidak" (no problems) is the GOOD answer
  // and "Ya" (problems occurred) is the BAD answer, unlike every other
  // Ya/Tidak field in the form.
  if (fieldKey === "q41_permasalahanSosial") {
    const lower = raw.toLowerCase();
    if (lower === "tidak") return 1;
    if (lower === "ya") return 0;
    return 0.5;
  }

  if (MULTI_VALUE_FIELDS.has(fieldKey)) {
    const maxOptions =
      { q24_cakupanLingkungan: 5, q40_cakupanSosial: 9, q51_cakupanNDPE: 4 }[
        fieldKey
      ] || 5;
    if (raw.toLowerCase().includes("belum")) return 0;
    const count = raw.split(";").filter((s) => s.trim()).length;
    return Math.min(1, count / maxOptions);
  }

  const lower = raw.toLowerCase();
  if (NEGATIVE_VALUES.has(lower)) return 0;
  const ev = hasEvidence(row, fieldKey);
  if (ev === true) return 1;
  if (ev === false) return 0.5;
  return 0.85;
}

function scoreSection(row, key) {
  if (key === "info") {
    const infoFields = [
      "q01_email",
      "q02_namaPerusahaan",
      "q03_groupPerusahaan",
      "q04_kapasitasPKS",
      "q05_koordinatPKS",
      "q06_jumlahTBS",
      "q07_produksiCPO",
      "q08_produksiPK",
      "q09_namaPengisi",
      "q10_emailAktif",
      "q11_nomorTelepon",
    ];
    const filled = infoFields.filter((f) => (row[f] || "").trim()).length;
    return filled === 0 ? null : filled / infoFields.length;
  }
  if (key === "cert") {
    const certs = getCertList(row);
    const rawAnswer = (row.q53_sertifikasi || "").trim();
    if (certs.length === 0) return rawAnswer ? 0 : null; // explicit "Belum ada" vs not answered yet
    return Math.min(1, certs.length / 3);
  }
  if (key === "enviro") {
    const kebunInti = (row.q25_kebunInti || "").trim().toLowerCase();
    const noKebunInti = kebunInti === "tidak";
    // Q25 dependents (Q26, Q28, Q30-33) only apply if the supplier actually
    // has Kebun Inti. If they answered "Tidak", those fields are N/A — they
    // shouldn't count as missing/unanswered, and Q25 itself isn't a
    // negative signal (not having Kebun Inti isn't a compliance failure).
    const dependentFields = [
      "q26_tahunTanam",
      "q28_penilaianHCVHCS",
      "q30_sistemPemantauan",
      "q31_soilAssessment",
      "q32_lahanGambut",
      "q33_bmpGambut",
    ];
    const fields = noKebunInti
      ? SECTION_FIELDS.enviro.filter(
          (f) => f !== "q25_kebunInti" && !dependentFields.includes(f)
        )
      : SECTION_FIELDS.enviro;
    const scores = fields
      .map((f) => scoreField(row, f))
      .filter((s) => s !== null);
    if (scores.length === 0) return null;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }
  if (key === "trace") {
    const hasSystem = (row.q44_sistemTraceability || "")
      .trim()
      .toLowerCase();
    const noSystem = hasSystem === "tidak";
    // Q45 (level of traceability) is only asked if Q44 confirms a system
    // exists. If Q44 = "Tidak", Q45 is skipped on the real form and should
    // not be treated as a missing/unanswered question.
    const fields = noSystem
      ? SECTION_FIELDS.trace.filter((f) => f !== "q45_tingkatTraceability")
      : SECTION_FIELDS.trace;
    const scores = fields
      .map((f) => scoreField(row, f))
      .filter((s) => s !== null);
    if (scores.length === 0) return null;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }
  const fields = SECTION_FIELDS[key];
  const scores = fields
    .map((f) => scoreField(row, f))
    .filter((s) => s !== null);
  if (scores.length === 0) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function computeScore(row) {
  let weightedSum = 0,
    weightCovered = 0;
  const bySection = {};
  SECTION_DEFS.forEach((sec) => {
    const s = scoreSection(row, sec.key);
    bySection[sec.key] = s;
    if (s !== null) {
      weightedSum += s * sec.weight;
      weightCovered += sec.weight;
    }
  });
  const overall = weightCovered > 0 ? (weightedSum / weightCovered) * 100 : 0;
  return { overall, bySection, completeness: weightCovered };
}

function tierOf(score) {
  if (score >= 80)
    return { label: "Rendah risiko", color: "var(--ok)", icon: ShieldCheck };
  if (score >= 55)
    return { label: "Risiko sedang", color: "var(--wr)", icon: ShieldAlert };
  return { label: "Risiko tinggi", color: "var(--er)", icon: ShieldX };
}

function parseProgress(row) {
  const m = (row.completedSections || "").match(/(\d+)\s*\/\s*(\d+)/);
  if (!m) return { done: 0, total: 8 };
  return { done: parseInt(m[1], 10), total: parseInt(m[2], 10) };
}

// Combines the standard certification checklist (q53_sertifikasi, e.g.
// "ISPO; RSPO") with any free-text "Yang lain : ...." answer stored
// separately in q53_sertifikasiLainnya. Without this, a supplier who only
// answered "Yang lain" has their typed-in certification silently dropped.
function getCertList(row) {
  const standard = (row.q53_sertifikasi || "")
    .trim()
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => !s.toLowerCase().includes("belum"));
  const other = (row.q53_sertifikasiLainnya || "").trim();
  return other ? [...standard, other] : standard;
}

// =========================================================================
// BRAND TOKENS
// =========================================================================

const T = {
  pg: "#1a472a",
  pg2: "#2d6a4f",
  pg3: "#40916c",
  pg5: "#b7e4c7",
  pg6: "#d8f3dc",
  gd: "#b8860b",
  gd3: "#f0e6c8",
  gd4: "#faf6ec",
  bg: "#f4f3ee",
  card: "#ffffff",
  fg: "#1a1a1a",
  fg2: "#4a4a4a",
  fg3: "#777777",
  bd: "#e2dfd6",
  er: "#c0392b",
  wr: "#e6a817",
  ok: "#2d6a4f",
};
const styleVars = {
  "--pg": T.pg,
  "--pg2": T.pg2,
  "--pg3": T.pg3,
  "--pg5": T.pg5,
  "--pg6": T.pg6,
  "--gd": T.gd,
  "--gd3": T.gd3,
  "--gd4": T.gd4,
  "--bg": T.bg,
  "--card": T.card,
  "--fg": T.fg,
  "--fg2": T.fg2,
  "--fg3": T.fg3,
  "--bd": T.bd,
  "--er": T.er,
  "--wr": T.wr,
  "--ok": T.ok,
};

// =========================================================================
// UI COMPONENTS
// =========================================================================

function Pill({ children, tone = "neutral" }) {
  const tones = {
    neutral: { bg: T.bg, fg: T.fg3, bd: T.bd },
    good: { bg: T.pg6, fg: T.pg, bd: T.pg5 },
    warn: { bg: T.gd4, fg: T.gd, bd: T.gd3 },
    bad: { bg: "#fde8e8", fg: T.er, bd: "#f5c6c0" },
  };
  const c = tones[tone];
  return (
    <span
      style={{
        background: c.bg,
        color: c.fg,
        border: `1px solid ${c.bd}`,
        borderRadius: 20,
        padding: "3px 10px",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.03em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function ScoreRing({ score, size = 64, incomplete = false }) {
  const tier = tierOf(score);
  const r = size / 2 - 5;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  return (
    <div
      style={{ position: "relative", width: size, height: size, flexShrink: 0 }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={T.bd}
          strokeWidth="5"
        />
        {!incomplete && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={tier.color}
            strokeWidth="5"
            strokeDasharray={`${filled} ${circ - filled}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize: size > 56 ? 16 : 13,
            fontWeight: 800,
            color: T.fg,
            fontFamily: "'Playfair Display', serif",
          }}
        >
          {incomplete ? "–" : Math.round(score)}
        </span>
      </div>
    </div>
  );
}

function SectionBar({ section, score }) {
  const Icon = section.icon;
  const pct = score === null ? null : Math.round(score * 100);
  const barColor =
    pct === null ? T.bd : pct >= 80 ? T.ok : pct >= 55 ? T.wr : T.er;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "7px 0",
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: T.pg6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={14} color={T.pg} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 4,
          }}
        >
          <span
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: T.fg2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {section.label}
          </span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: pct === null ? T.fg3 : T.fg,
              flexShrink: 0,
              marginLeft: 8,
            }}
          >
            {pct === null ? "Belum diisi" : `${pct}%`}
          </span>
        </div>
        <div
          style={{
            height: 6,
            background: T.bd,
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: pct === null ? "0%" : `${pct}%`,
              background: barColor,
              borderRadius: 3,
              transition: "width .4s ease",
            }}
          />
        </div>
      </div>
      <span
        style={{
          fontSize: 10,
          color: T.fg3,
          fontWeight: 600,
          width: 30,
          textAlign: "right",
          flexShrink: 0,
        }}
      >
        {Math.round(section.weight * 100)}%
      </span>
    </div>
  );
}

function FieldRow({ row, fieldKey }) {
  const label = FIELD_LABELS[fieldKey] || fieldKey;
  const raw = (row[fieldKey] || "").trim();
  const score = scoreField(row, fieldKey);
  const ev = hasEvidence(row, fieldKey);
  if (!raw) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 0",
          borderBottom: `1px solid ${T.bd}`,
        }}
      >
        <span style={{ fontSize: 12.5, color: T.fg3, fontStyle: "italic" }}>
          {label}
        </span>
        <Pill tone="neutral">Belum dijawab</Pill>
      </div>
    );
  }
  const tone = score >= 0.85 ? "good" : score >= 0.5 ? "warn" : "bad";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 10,
        padding: "8px 0",
        borderBottom: `1px solid ${T.bd}`,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: T.fg, fontWeight: 500 }}>
          {label}
        </div>
        <div style={{ fontSize: 11.5, color: T.fg3, marginTop: 1 }}>{raw}</div>
      </div>
      <div
        style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}
      >
        {ev === true && <Paperclip size={12} color={T.ok} />}
        {ev === false && <FileWarning size={12} color={T.wr} />}
        <Pill tone={tone}>{Math.round(score * 100)}%</Pill>
      </div>
    </div>
  );
}

function SupplierDetail({ supplier, onBack }) {
  const { result, raw } = supplier;
  const tier = tierOf(result.overall);
  const TierIcon = tier.icon;
  const [openSection, setOpenSection] = useState(null);

  const radarData = SECTION_DEFS.filter((s) => s.key !== "info").map((s) => ({
    section: s.label.split(" ")[0],
    score:
      result.bySection[s.key] === null
        ? 0
        : Math.round(result.bySection[s.key] * 100),
  }));

  const unverifiedClaims = useMemo(() => {
    const gaps = [];
    Object.entries(EVIDENCE_REF).forEach(([fieldKey, ref]) => {
      if (
        (raw[fieldKey] || "").trim() &&
        hasEvidence(raw, fieldKey) === false
      ) {
        gaps.push(FIELD_LABELS[fieldKey] || fieldKey);
      }
    });
    return gaps;
  }, [raw]);

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <button
        onClick={onBack}
        style={{
          background: "none",
          border: "none",
          color: T.pg2,
          fontSize: 12.5,
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 5,
          marginBottom: 16,
          padding: 0,
        }}
      >
        ← Kembali ke daftar submission
      </button>

      <div
        style={{
          background: T.card,
          border: `1px solid ${T.bd}`,
          borderRadius: 12,
          padding: 24,
          marginBottom: 16,
          boxShadow: "0 1px 3px rgba(0,0,0,.06)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            flexWrap: "wrap",
          }}
        >
          <ScoreRing
            score={result.overall}
            size={72}
            incomplete={!supplier.name}
          />
          <div style={{ flex: 1, minWidth: 200 }}>
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 20,
                fontWeight: 800,
                color: T.pg,
                margin: 0,
              }}
            >
              {supplier.displayName}
            </h2>
            <div style={{ fontSize: 12.5, color: T.fg3, marginTop: 3 }}>
              {[supplier.group, supplier.location, supplier.capacity]
                .filter(Boolean)
                .join(" · ") || "Belum ada detail perusahaan"}
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 10,
                flexWrap: "wrap",
              }}
            >
              {supplier.name ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    color: tier.color,
                  }}
                >
                  <TierIcon size={15} />
                  {tier.label}
                </span>
              ) : (
                <Pill tone="warn">Belum cukup data untuk dinilai</Pill>
              )}
              <Pill tone="neutral">
                {supplier.progress.done}/{supplier.progress.total} bagian terisi
              </Pill>
              <Pill tone="neutral">
                {supplier.totalFilesUploaded} file diunggah
              </Pill>
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: 14,
            paddingTop: 14,
            borderTop: `1px solid ${T.bd}`,
            fontSize: 11.5,
            color: T.fg3,
            flexWrap: "wrap",
          }}
        >
          <span>
            Submission ID:{" "}
            <strong style={{ color: T.fg2 }}>{supplier.submissionId}</strong>
          </span>
          <span>
            Dikirim:{" "}
            <strong style={{ color: T.fg2 }}>
              {new Date(supplier.timestamp).toLocaleString("id-ID")}
            </strong>
          </span>
          {supplier.pengisi && (
            <span>
              Pengisi:{" "}
              <strong style={{ color: T.fg2 }}>{supplier.pengisi}</strong>
            </span>
          )}
          {supplier.email && (
            <span>
              Email: <strong style={{ color: T.fg2 }}>{supplier.email}</strong>
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 1fr",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            background: T.card,
            border: `1px solid ${T.bd}`,
            borderRadius: 12,
            padding: "18px 20px",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: T.pg,
              marginBottom: 10,
              fontFamily: "'Playfair Display', serif",
            }}
          >
            Skor per kategori
          </div>
          {SECTION_DEFS.map((sec) => (
            <SectionBar
              key={sec.key}
              section={sec}
              score={result.bySection[sec.key]}
            />
          ))}
        </div>
        <div
          style={{
            background: T.card,
            border: `1px solid ${T.bd}`,
            borderRadius: 12,
            padding: "18px 20px",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: T.pg,
              marginBottom: 6,
              fontFamily: "'Playfair Display', serif",
            }}
          >
            Profil risiko
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke={T.bd} />
              <PolarAngleAxis
                dataKey="section"
                tick={{ fill: T.fg3, fontSize: 10.5 }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={{ fill: T.fg3, fontSize: 9 }}
                tickCount={4}
              />
              <Radar
                dataKey="score"
                stroke={T.pg2}
                fill={T.pg3}
                fillOpacity={0.35}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {unverifiedClaims.length > 0 && (
        <div
          style={{
            background: T.gd4,
            border: `1px solid ${T.gd3}`,
            borderRadius: 12,
            padding: "14px 18px",
            marginBottom: 16,
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
          }}
        >
          <AlertTriangle
            size={16}
            color={T.gd}
            style={{ flexShrink: 0, marginTop: 2 }}
          />
          <div>
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 700,
                color: T.gd,
                marginBottom: 4,
              }}
            >
              {unverifiedClaims.length} jawaban positif tanpa file bukti
            </div>
            <div style={{ fontSize: 11.5, color: T.fg2, lineHeight: 1.6 }}>
              {unverifiedClaims.join(", ")} — skor diberi 50% karena belum
              terverifikasi dengan dokumen di kolom uploadedFiles.
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: T.pg,
          marginBottom: 10,
          fontFamily: "'Playfair Display', serif",
        }}
      >
        Rincian jawaban per bagian
      </div>
      {SECTION_DEFS.filter((s) => s.key !== "info").map((sec) => {
        const isOpen = openSection === sec.key;
        const Icon = sec.icon;
        if (sec.key === "cert") {
          const certs = getCertList(raw);
          return (
            <div
              key={sec.key}
              style={{
                background: T.card,
                border: `1px solid ${T.bd}`,
                borderRadius: 10,
                marginBottom: 8,
                overflow: "hidden",
              }}
            >
              <button
                onClick={() => setOpenSection(isOpen ? null : sec.key)}
                style={{
                  width: "100%",
                  background: "none",
                  border: "none",
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    color: T.fg,
                  }}
                >
                  <Icon size={15} color={T.pg} />
                  {sec.label}
                </span>
                {isOpen ? (
                  <ChevronUp size={15} color={T.fg3} />
                ) : (
                  <ChevronDown size={15} color={T.fg3} />
                )}
              </button>
              {isOpen && (
                <div style={{ padding: "0 16px 14px" }}>
                  {certs.length > 0 ? (
                    certs.map((cert) => (
                      <span
                        key={cert}
                        style={{
                          marginRight: 6,
                          display: "inline-block",
                          marginBottom: 6,
                        }}
                      >
                        <Pill tone="good">{cert}</Pill>
                      </span>
                    ))
                  ) : (
                    <Pill tone="neutral">Belum dijawab</Pill>
                  )}
                </div>
              )}
            </div>
          );
        }
        const fields = SECTION_FIELDS[sec.key];
        return (
          <div
            key={sec.key}
            style={{
              background: T.card,
              border: `1px solid ${T.bd}`,
              borderRadius: 10,
              marginBottom: 8,
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => setOpenSection(isOpen ? null : sec.key)}
              style={{
                width: "100%",
                background: "none",
                border: "none",
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  color: T.fg,
                }}
              >
                <Icon size={15} color={T.pg} />
                {sec.label}
                {result.bySection[sec.key] === null && (
                  <Pill tone="neutral">Belum diisi</Pill>
                )}
              </span>
              {isOpen ? (
                <ChevronUp size={15} color={T.fg3} />
              ) : (
                <ChevronDown size={15} color={T.fg3} />
              )}
            </button>
            {isOpen && (
              <div style={{ padding: "0 16px 8px" }}>
                {fields.map((f) => (
                  <FieldRow key={f} row={raw} fieldKey={f} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function OverviewBar({ data }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(140, data.length * 46)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 24, left: 4, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={T.bd} horizontal={false} />
        <XAxis
          type="number"
          domain={[0, 100]}
          tick={{ fill: T.fg3, fontSize: 11 }}
        />
        <YAxis
          type="category"
          dataKey="shortName"
          width={160}
          tick={{ fill: T.fg2, fontSize: 11 }}
        />
        <Tooltip
          contentStyle={{
            background: T.card,
            border: `1px solid ${T.bd}`,
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(v) => [`${Math.round(v)}%`, "Skor kepatuhan"]}
        />
        <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={22}>
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={d.score >= 80 ? T.ok : d.score >= 55 ? T.wr : T.er}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function SupplierCard({ supplier, onOpen }) {
  const tier = tierOf(supplier.result.overall);
  const TierIcon = tier.icon;

  return (
    <button
      onClick={() => onOpen(supplier.submissionId)}
      style={{
        textAlign: "left",
        background: T.card,
        border: `1px solid ${T.bd}`,
        borderRadius: 12,
        padding: 18,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 14,
        width: "100%",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = T.pg3;
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = T.bd;
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {supplier.isComplete ? (
        <ScoreRing score={supplier.result.overall} size={60} />
      ) : (
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: "50%",
            border: `5px solid ${T.bd}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            position: "relative",
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: T.fg3 }}>
            {supplier.progress.done}/{supplier.progress.total}
          </span>
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: supplier.name ? T.fg : T.fg3,
            fontStyle: supplier.name ? "normal" : "italic",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {supplier.displayName}
        </div>
        <div style={{ fontSize: 11.5, color: T.fg3, marginTop: 2 }}>
          {[supplier.group, supplier.capacity].filter(Boolean).join(" · ") ||
            `Submission ${supplier.submissionId}`}
        </div>
        <div
          style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}
        >
          {supplier.isComplete ? (
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <TierIcon size={13} color={tier.color} />
              <span
                style={{ fontSize: 12, fontWeight: 700, color: tier.color }}
              >
                {tier.label}
              </span>
            </span>
          ) : (
            <Pill tone="warn">
              Belum lengkap · {supplier.progress.done}/{supplier.progress.total}{" "}
              bagian
            </Pill>
          )}
          {supplier.totalFilesUploaded > 0 && (
            <Pill tone="neutral">{supplier.totalFilesUploaded} file</Pill>
          )}
        </div>
      </div>
      <div
        style={{
          fontSize: 11,
          color: T.fg3,
          textAlign: "right",
          flexShrink: 0,
        }}
      >
        Dikirim
        <br />
        <strong style={{ color: T.fg2 }}>
          {new Date(supplier.timestamp).toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "short",
          })}
        </strong>
        <br />
        {new Date(supplier.timestamp).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
    </button>
  );
}

function MetricCard({ label, value, sub, tone = "neutral" }) {
  const toneColor =
    tone === "good"
      ? T.ok
      : tone === "bad"
      ? T.er
      : tone === "warn"
      ? T.wr
      : T.pg;
  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.bd}`,
        borderRadius: 12,
        padding: "16px 18px",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: T.fg3,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 800,
          color: toneColor,
          fontFamily: "'Playfair Display', serif",
          marginTop: 4,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11.5, color: T.fg3, marginTop: 2 }}>{sub}</div>
      )}
    </div>
  );
}

// =========================================================================
// MAIN APP COMPONENT
// =========================================================================

export default function App() {
  const [rawData, setRawData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState("overview");
  const [search, setSearch] = useState("");

  // SAYA SUDAH MEMASUKKAN DAN MENGUBAH LINK ANDA DI SINI
  const GOOGLE_SHEET_CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRTiQwenugST4VVXoHf0vTjek60rACV_OrmcyqjNJeBAALrCKoYA44CrcgDkN38FpJhCOqbFvEs2_oF/pub?gid=1808017977&single=true&output=csv";

  // This automatically fetches the data when the page loads
  useEffect(() => {
    if (GOOGLE_SHEET_CSV_URL === "PASTE_YOUR_CSV_LINK_HERE") {
      setIsLoading(false);
      return;
    }

    Papa.parse(GOOGLE_SHEET_CSV_URL, {
      download: true,
      header: true,
      complete: (results) => {
        // We filter to make sure we don't grab empty rows from the bottom of the sheet
        const validData = results.data.filter(
          (row) => row.submissionId && row.submissionId.trim() !== ""
        );
        setRawData(validData);
        setIsLoading(false);
      },
      error: (error) => {
        console.error("Gagal menarik data:", error);
        setIsLoading(false);
      },
    });
  }, []);

  // This translates the raw Google Sheet rows into the format our Dashboard needs
  const SUPPLIERS = useMemo(() => {
    return rawData.map((row) => {
      const progress = parseProgress(row);
      const name = row.q02_namaPerusahaan?.trim() || null;
      return {
        submissionId: row.submissionId,
        name,
        displayName:
          name || `(Belum isi nama — ${row.submissionId?.replace("SUB-", "")})`,
        email: row.q01_email?.trim() || row.q10_emailAktif?.trim() || null,
        pengisi: row.q09_namaPengisi?.trim() || null,
        group: row.q03_groupPerusahaan?.trim() || null,
        location: row.q05_koordinatPKS?.trim() || null,
        capacity: row.q04_kapasitasPKS?.trim() || null,
        timestamp: row.submissionTimestamp,
        progress,
        isComplete: progress.done >= progress.total,
        raw: row,
        result: computeScore(row),
        totalFilesUploaded: parseInt(row.totalFilesUploaded || 0, 10),
      };
    });
  }, [rawData]);

  if (isLoading) {
    return (
      <div
        style={{
          ...styleVars,
          background: T.bg,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        <h2 style={{ color: T.pg }}>Menarik data dari Google Sheets...</h2>
      </div>
    );
  }

  if (rawData.length === 0) {
    return (
      <div
        style={{
          ...styleVars,
          background: T.bg,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        <div
          style={{
            textAlign: "center",
            padding: 40,
            background: T.card,
            borderRadius: 12,
            border: `1px solid ${T.bd}`,
          }}
        >
          <AlertTriangle size={32} color={T.wr} style={{ marginBottom: 10 }} />
          <h2 style={{ color: T.pg, margin: "0 0 10px 0" }}>
            Data Belum Ditemukan
          </h2>
          <p style={{ color: T.fg2, maxWidth: 400 }}>
            Pastikan kolom-kolom di Google Sheet Anda sesuai dengan yang
            dibutuhkan program (seperti kolom <code>submissionId</code>,{" "}
            <code>q02_namaPerusahaan</code>, dll).
          </p>
        </div>
      </div>
    );
  }

  const complete = SUPPLIERS.filter((s) => s.isComplete);
  const incomplete = SUPPLIERS.filter((s) => !s.isComplete);
  const scoreable = SUPPLIERS.filter((s) => s.progress.done >= 2 && s.name);

  const avgScore = scoreable.length
    ? scoreable.reduce((a, s) => a + s.result.overall, 0) / scoreable.length
    : 0;
  const highRisk = scoreable.filter((s) => s.result.overall < 55).length;
  const totalFiles = SUPPLIERS.reduce((a, s) => a + s.totalFilesUploaded, 0);

  const barData = [...scoreable]
    .sort((a, b) => a.result.overall - b.result.overall)
    .map((s) => ({
      shortName: s.name.length > 26 ? s.name.slice(0, 24) + "…" : s.name,
      score: Math.round(s.result.overall),
    }));

  const filtered = SUPPLIERS.filter(
    (s) =>
      s.displayName.toLowerCase().includes(search.toLowerCase()) ||
      s.submissionId.toLowerCase().includes(search.toLowerCase())
  );
  const selected =
    view !== "overview" ? SUPPLIERS.find((s) => s.submissionId === view) : null;

  return (
    <div
      style={{
        ...styleVars,
        background: T.bg,
        minHeight: "100vh",
        padding: "28px 28px 40px",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        borderRadius: 14,
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Playfair+Display:wght@700;800&display=swap"
        rel="stylesheet"
      />

      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 11px",
            borderRadius: 20,
            background: T.gd4,
            color: T.gd,
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            marginBottom: 8,
            border: `1px solid ${T.gd3}`,
          }}
        >
          <ShieldCheck size={11} /> NDPE 3.0-Permata
        </div>
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 26,
            fontWeight: 800,
            color: T.pg,
            margin: 0,
          }}
        >
          Dasbor Kepatuhan NDPE
        </h1>
        <div style={{ fontSize: 12.5, color: T.fg3, marginTop: 4 }}>
          Permata Group · Live dari Google Sheets
        </div>
      </div>

      {view === "overview" ? (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <MetricCard
              label="Total submission"
              value={SUPPLIERS.length}
              sub={`${complete.length} lengkap · ${incomplete.length} belum selesai`}
            />
            <MetricCard
              label="Skor rata-rata (yang bisa dinilai)"
              value={scoreable.length ? `${Math.round(avgScore)}%` : "–"}
              sub={
                scoreable.length
                  ? `dari ${scoreable.length} submission`
                  : "belum ada data cukup"
              }
              tone={
                scoreable.length === 0
                  ? "neutral"
                  : avgScore >= 70
                  ? "good"
                  : avgScore >= 50
                  ? "warn"
                  : "bad"
              }
            />
            <MetricCard
              label="Risiko tinggi (&lt;55%)"
              value={highRisk}
              sub="Perlu tindak lanjut"
              tone={highRisk > 0 ? "bad" : "good"}
            />
            <MetricCard
              label="Total file diunggah"
              value={totalFiles}
              sub="Semua submission"
            />
          </div>

          {barData.length > 0 ? (
            <div
              style={{
                background: T.card,
                border: `1px solid ${T.bd}`,
                borderRadius: 12,
                padding: "18px 22px",
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: T.pg,
                  marginBottom: 4,
                  fontFamily: "'Playfair Display', serif",
                }}
              >
                Perbandingan skor supplier
              </div>
              <div style={{ fontSize: 11.5, color: T.fg3, marginBottom: 10 }}>
                Hanya submission dengan ≥2 bagian terisi dan nama perusahaan
                diketahui
              </div>
              <OverviewBar data={barData} />
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  marginTop: 6,
                  fontSize: 11,
                  color: T.fg3,
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: 2,
                      background: T.ok,
                    }}
                  />
                  ≥80% rendah risiko
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: 2,
                      background: T.wr,
                    }}
                  />
                  55–79% sedang
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: 2,
                      background: T.er,
                    }}
                  />
                  &lt;55% tinggi
                </span>
              </div>
            </div>
          ) : (
            <div
              style={{
                background: T.card,
                border: `1px solid ${T.bd}`,
                borderRadius: 12,
                padding: "32px 22px",
                marginBottom: 20,
                textAlign: "center",
              }}
            >
              <Inbox size={28} color={T.fg3} style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 13, color: T.fg3 }}>
                Belum ada submission dengan cukup data untuk dibandingkan.
              </div>
            </div>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: T.pg,
                fontFamily: "'Playfair Display', serif",
              }}
            >
              Semua submission
            </div>
            <div style={{ position: "relative" }}>
              <Search
                size={13}
                color={T.fg3}
                style={{
                  position: "absolute",
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama atau ID..."
                style={{
                  padding: "7px 12px 7px 30px",
                  borderRadius: 8,
                  border: `1px solid ${T.bd}`,
                  fontSize: 12.5,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  outline: "none",
                  background: T.bg,
                  width: 220,
                }}
              />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((s) => (
              <SupplierCard
                key={s.submissionId}
                supplier={s}
                onOpen={setView}
              />
            ))}
            {filtered.length === 0 && (
              <div
                style={{
                  fontSize: 12.5,
                  color: T.fg3,
                  padding: 20,
                  textAlign: "center",
                }}
              >
                Tidak ada submission yang cocok.
              </div>
            )}
          </div>
        </>
      ) : (
        <SupplierDetail
          supplier={selected}
          onBack={() => setView("overview")}
        />
      )}
    </div>
  );
}
