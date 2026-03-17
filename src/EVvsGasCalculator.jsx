import { useState, useMemo } from "react";

const GAS = "#ea580c";
const EV  = "#0891b2";

const defaults = {
  gasCityEfficiency: 7,
  gasHighwayEfficiency: 11,
  fuelPrice: 30,
  gasInsurance: 15000,
  gasTax: 5000,
  gasOilChange: 5000,
  gasMaintenance: 10000,
  gasDepreciation: 100000,
  gasDepreciationYears: 3,

  evCityEfficiency: 11,
  evHighwayEfficiency: 15,
  evHomePricePerKwh: 2.5,
  evPublicPricePerKwh: 5,
  evInsurance: 40000,
  evTax: 0,
  evMaintenance: 0,
  evDepreciation: 100000,
  evDepreciationYears: 1,

  workCommuteKm: 1000,
  leisureDriveKm: 2000,
};

function InputField({ label, unit, value, onChange, step = 1, min = 0 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "7px 0", borderBottom: "1px solid #f1f5f9" }}>
      <span style={{ fontSize: 13, color: "#475569", flex: 1 }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          step={step}
          min={min}
          style={{
            width: 88,
            padding: "5px 8px",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 6,
            color: "#0f172a",
            fontSize: 13,
            textAlign: "right",
            outline: "none",
            fontVariantNumeric: "tabular-nums",
          }}
        />
        {unit && <span style={{ fontSize: 11, color: "#94a3b8", width: 52, flexShrink: 0 }}>{unit}</span>}
      </div>
    </div>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 14,
      border: "1px solid #e2e8f0",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionHead({ label, color }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      paddingBottom: 10,
      marginBottom: 4,
      borderBottom: `2px solid ${color}`,
    }}>
      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color }}>{label}</span>
    </div>
  );
}

export default function EVvsGasCalculator() {
  const [v, setV] = useState(defaults);
  const set = (key) => (val) => setV((p) => ({ ...p, [key]: val }));

  const result = useMemo(() => {
    const workKmYear = v.workCommuteKm * 12;
    const leisureKmYear = v.leisureDriveKm * 12;
    const totalKmYear = workKmYear + leisureKmYear;

    const gasCityPerKm = v.fuelPrice / v.gasCityEfficiency;
    const gasHwyPerKm  = v.fuelPrice / v.gasHighwayEfficiency;
    const evCityPerKm  = (v.evCityEfficiency / 100) * v.evHomePricePerKwh;
    const evHwyPerKm   = (v.evHighwayEfficiency / 100) * v.evPublicPricePerKwh;

    const gasWorkEnergy    = gasCityPerKm * workKmYear;
    const gasLeisureEnergy = gasHwyPerKm  * leisureKmYear;
    const evWorkEnergy     = evCityPerKm  * workKmYear;
    const evLeisureEnergy  = evHwyPerKm   * leisureKmYear;

    const cityFrac   = totalKmYear > 0 ? workKmYear / totalKmYear : 0.5;
    const gasBlended = gasCityPerKm * cityFrac + gasHwyPerKm * (1 - cityFrac);
    const evBlended  = evCityPerKm  * cityFrac + evHwyPerKm  * (1 - cityFrac);
    const savingsPerKm = gasBlended - evBlended;

    const gasFixed  = v.gasInsurance + v.gasTax + v.gasOilChange + v.gasMaintenance + v.gasDepreciation / v.gasDepreciationYears;
    const evFixed   = v.evInsurance  + v.evTax  + v.evMaintenance                  + v.evDepreciation  / v.evDepreciationYears;
    const fixedDelta = evFixed - gasFixed;

    let crossoverKmYear = null, crossoverKmMonth = null;
    if (savingsPerKm > 0 && fixedDelta > 0) {
      crossoverKmYear  = fixedDelta / savingsPerKm;
      crossoverKmMonth = crossoverKmYear / 12;
    }

    const gasAnnual = gasFixed + gasWorkEnergy + gasLeisureEnergy;
    const evAnnual  = evFixed  + evWorkEnergy  + evLeisureEnergy;

    return {
      gasCityPerKm, gasHwyPerKm, gasBlended,
      evCityPerKm,  evHwyPerKm,  evBlended,
      savingsPerKm, gasFixed, evFixed, fixedDelta,
      crossoverKmYear, crossoverKmMonth,
      gasAnnual, evAnnual,
      annualKm: totalKmYear,
      monthlyKm: v.workCommuteKm + v.leisureDriveKm,
      gasWorkEnergy, gasLeisureEnergy,
      evWorkEnergy,  evLeisureEnergy,
      winner:  gasAnnual < evAnnual ? "gas" : "ev",
      savings: Math.abs(gasAnnual - evAnnual),
    };
  }, [v]);

  const evWinsAlways  = result.savingsPerKm > 0 && result.fixedDelta <= 0;
  const gasWinsAlways = result.savingsPerKm <= 0;

  // Chart
  const maxKm = Math.max((result.crossoverKmYear || 50000) * 1.5, result.annualKm * 1.3, 60000);
  const N = 50;
  const svgW = 480, svgH = 190, pad = { t: 12, r: 12, b: 32, l: 58 };
  const plotW = svgW - pad.l - pad.r;
  const plotH = svgH - pad.t - pad.b;
  const costAt = (km, fixed, perKm) => fixed + perKm * km;
  const maxCost = costAt(maxKm, Math.max(result.gasFixed, result.evFixed), Math.max(result.gasBlended, result.evBlended));
  const xS = (km)   => pad.l + (km   / maxKm)   * plotW;
  const yS = (cost) => pad.t + plotH - (cost / maxCost) * plotH;

  const line = (fixed, blended) =>
    Array.from({ length: N + 1 }, (_, i) => {
      const km = (i / N) * maxKm;
      return `${xS(km)},${yS(costAt(km, fixed, blended))}`;
    }).join(" ");

  const fmt  = (n) => Math.round(n).toLocaleString();
  const fmtK = (n) => n >= 1000 ? `${(n / 1000).toFixed(0)}k` : fmt(n);

  // winner colors
  const winnerColor = result.winner === "ev" ? EV : GAS;
  const winnerLabel = result.winner === "ev" ? "⚡ EV" : "⛽ Gas";

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", padding: "24px 16px 40px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", color: "#0f172a" }}>
            EV vs Gasoline
          </h1>
          <p style={{ marginTop: 4, fontSize: 13, color: "#94a3b8", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Total Cost of Ownership Calculator
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, alignItems: "start" }}>

          {/* ── LEFT: Inputs ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Driving */}
            <Card style={{ padding: "16px 20px" }}>
              <SectionHead label="Your Driving" color="#7c3aed" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                <InputField label="Work commute (city)" unit="km/mo" value={v.workCommuteKm} onChange={set("workCommuteKm")} step={100} />
                <InputField label="Leisure drive (highway)" unit="km/mo" value={v.leisureDriveKm} onChange={set("leisureDriveKm")} step={100} />
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: "#94a3b8", textAlign: "center" }}>
                {fmt(result.monthlyKm)} km/month &nbsp;·&nbsp; {fmt(result.annualKm)} km/year
              </div>
            </Card>

            {/* Gas + EV side by side */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Card style={{ padding: "16px 20px" }}>
                <SectionHead label="⛽ Gasoline" color={GAS} />
                <InputField label="Fuel price" unit="฿/L" value={v.fuelPrice} onChange={set("fuelPrice")} step={0.5} />
                <InputField label="City efficiency" unit="km/L" value={v.gasCityEfficiency} onChange={set("gasCityEfficiency")} step={0.5} />
                <InputField label="Hwy efficiency" unit="km/L" value={v.gasHighwayEfficiency} onChange={set("gasHighwayEfficiency")} step={0.5} />
                <InputField label="Insurance" unit="฿/yr" value={v.gasInsurance} onChange={set("gasInsurance")} step={1000} />
                <InputField label="Road tax" unit="฿/yr" value={v.gasTax} onChange={set("gasTax")} step={500} />
                <InputField label="Oil changes" unit="฿/yr" value={v.gasOilChange} onChange={set("gasOilChange")} step={500} />
                <InputField label="Maintenance" unit="฿/yr" value={v.gasMaintenance} onChange={set("gasMaintenance")} step={1000} />
                <InputField label="Depreciation" unit="฿" value={v.gasDepreciation} onChange={set("gasDepreciation")} step={10000} />
                <InputField label="Deprec. period" unit="years" value={v.gasDepreciationYears} onChange={set("gasDepreciationYears")} step={1} min={1} />
              </Card>

              <Card style={{ padding: "16px 20px" }}>
                <SectionHead label="⚡ Electric" color={EV} />
                <InputField label="Home electricity" unit="฿/kWh" value={v.evHomePricePerKwh} onChange={set("evHomePricePerKwh")} step={0.1} />
                <InputField label="Public charging" unit="฿/kWh" value={v.evPublicPricePerKwh} onChange={set("evPublicPricePerKwh")} step={0.5} />
                <InputField label="City consumption" unit="kWh/100km" value={v.evCityEfficiency} onChange={set("evCityEfficiency")} step={0.5} />
                <InputField label="Hwy consumption" unit="kWh/100km" value={v.evHighwayEfficiency} onChange={set("evHighwayEfficiency")} step={0.5} />
                <InputField label="Insurance" unit="฿/yr" value={v.evInsurance} onChange={set("evInsurance")} step={1000} />
                <InputField label="Road tax" unit="฿/yr" value={v.evTax} onChange={set("evTax")} step={500} />
                <InputField label="Maintenance" unit="฿/yr" value={v.evMaintenance} onChange={set("evMaintenance")} step={1000} />
                <InputField label="Depreciation" unit="฿" value={v.evDepreciation} onChange={set("evDepreciation")} step={10000} />
                <InputField label="Deprec. period" unit="years" value={v.evDepreciationYears} onChange={set("evDepreciationYears")} step={1} min={1} />
              </Card>
            </div>
          </div>

          {/* ── RIGHT: Results (sticky) ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, position: "sticky", top: 16 }}>

            {/* Crossover banner */}
            <Card style={{ padding: "20px", textAlign: "center", borderTop: `3px solid ${evWinsAlways ? EV : gasWinsAlways ? GAS : "#7c3aed"}` }}>
              {evWinsAlways ? (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: EV, marginBottom: 6 }}>EV wins at any mileage</div>
                  <div style={{ fontSize: 13, color: "#64748b" }}>Lower fixed costs AND lower running costs</div>
                </>
              ) : gasWinsAlways ? (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: GAS, marginBottom: 6 }}>Gas always cheaper</div>
                  <div style={{ fontSize: 13, color: "#64748b" }}>EV running cost is higher — no crossover</div>
                </>
              ) : result.crossoverKmMonth ? (
                <>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 8 }}>Crossover Point</div>
                  <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.03em", color: "#0f172a", lineHeight: 1 }}>
                    {fmt(result.crossoverKmMonth)}
                  </div>
                  <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>km / month</div>
                  <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 6 }}>
                    {fmt(result.crossoverKmYear)} km/yr · {fmt(result.crossoverKmYear / 365)} km/day
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 14, fontSize: 11, fontWeight: 600 }}>
                    <div style={{ flex: 1, padding: "6px 0", borderRadius: 8, background: "#fff7ed", color: GAS }}>Below → ⛽ Gas wins</div>
                    <div style={{ flex: 1, padding: "6px 0", borderRadius: 8, background: "#ecfeff", color: EV }}>Above → ⚡ EV wins</div>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 13, color: "#94a3b8" }}>Adjust parameters to calculate</div>
              )}
            </Card>

            {/* Annual cost comparison */}
            <Card style={{ padding: "16px 20px" }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 12 }}>
                Your scenario · {fmt(result.monthlyKm)} km/mo
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                {[
                  { label: "⛽ Gasoline", annual: result.gasAnnual, color: GAS, bg: "#fff7ed" },
                  { label: "⚡ Electric", annual: result.evAnnual,  color: EV,  bg: "#ecfeff" },
                ].map(({ label, annual, color, bg }) => (
                  <div key={label} style={{ background: bg, borderRadius: 10, padding: "12px", textAlign: "center" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>{fmtK(annual)}</div>
                    <div style={{ fontSize: 10, color: "#94a3b8" }}>฿/yr · {fmtK(annual / 12)} /mo</div>
                  </div>
                ))}
              </div>
              <div style={{
                textAlign: "center",
                padding: "8px 12px",
                borderRadius: 8,
                background: result.winner === "ev" ? "#ecfeff" : "#fff7ed",
                fontSize: 12,
                fontWeight: 700,
                color: winnerColor,
              }}>
                {winnerLabel} saves {fmt(result.savings)} ฿/year
              </div>
            </Card>

            {/* Chart */}
            <Card style={{ padding: "16px 20px" }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 10 }}>
                Annual cost vs distance
              </div>
              <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: "100%", height: "auto" }}>
                {/* Grid */}
                {[0, 0.25, 0.5, 0.75, 1].map((f) => (
                  <g key={f}>
                    <line x1={pad.l} x2={svgW - pad.r} y1={pad.t + plotH * (1 - f)} y2={pad.t + plotH * (1 - f)} stroke="#f1f5f9" strokeWidth="1" />
                    <text x={pad.l - 5} y={pad.t + plotH * (1 - f) + 3} textAnchor="end" fill="#cbd5e1" fontSize="8" fontFamily="system-ui">
                      {fmtK(maxCost * f)}
                    </text>
                  </g>
                ))}
                {[0, 0.25, 0.5, 0.75, 1].map((f) => (
                  <text key={f} x={xS(maxKm * f)} y={svgH - 6} textAnchor="middle" fill="#cbd5e1" fontSize="8" fontFamily="system-ui">
                    {fmtK(maxKm * f)}
                  </text>
                ))}

                {/* Fill areas */}
                <polyline points={line(result.gasFixed, result.gasBlended)} fill="none" stroke={GAS} strokeWidth="2.5" strokeLinejoin="round" />
                <polyline points={line(result.evFixed, result.evBlended)}   fill="none" stroke={EV}  strokeWidth="2.5" strokeLinejoin="round" />

                {/* Crossover dot */}
                {result.crossoverKmYear && result.crossoverKmYear < maxKm && (
                  <circle cx={xS(result.crossoverKmYear)} cy={yS(costAt(result.crossoverKmYear, result.gasFixed, result.gasBlended))}
                    r="5" fill="#fff" stroke="#7c3aed" strokeWidth="2" />
                )}

                {/* "You" line */}
                <line x1={xS(result.annualKm)} x2={xS(result.annualKm)} y1={pad.t} y2={pad.t + plotH}
                  stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4,3" />
                <text x={xS(result.annualKm)} y={pad.t + plotH + 18} textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="system-ui">YOU</text>

                {/* Legend */}
                <rect x={svgW - pad.r - 64} y={pad.t} width={58} height={28} rx="4" fill="white" fillOpacity="0.9" />
                <circle cx={svgW - pad.r - 54} cy={pad.t + 9} r="3.5" fill={GAS} />
                <text x={svgW - pad.r - 47} y={pad.t + 12} fill={GAS} fontSize="8" fontFamily="system-ui">Gasoline</text>
                <circle cx={svgW - pad.r - 54} cy={pad.t + 21} r="3.5" fill={EV} />
                <text x={svgW - pad.r - 47} y={pad.t + 24} fill={EV} fontSize="8" fontFamily="system-ui">Electric</text>

                <text x={svgW / 2} y={svgH} textAnchor="middle" fill="#cbd5e1" fontSize="8" fontFamily="system-ui">km / year</text>
              </svg>
            </Card>

            {/* Per-km table */}
            <Card style={{ padding: "16px 20px" }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 10 }}>
                Energy cost per km
              </div>
              <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", paddingBottom: 6, color: "#94a3b8", fontWeight: 600 }}></th>
                    <th style={{ textAlign: "right", paddingBottom: 6, color: GAS, fontWeight: 700 }}>⛽ Gas</th>
                    <th style={{ textAlign: "right", paddingBottom: 6, color: EV,  fontWeight: 700 }}>⚡ EV</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["City",    result.gasCityPerKm.toFixed(2), result.evCityPerKm.toFixed(3)],
                    ["Highway", result.gasHwyPerKm.toFixed(2),  result.evHwyPerKm.toFixed(3)],
                    ["Blended", result.gasBlended.toFixed(2),   result.evBlended.toFixed(3)],
                  ].map(([row, gas, ev], i) => (
                    <tr key={row} style={{ borderTop: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "5px 0", color: i === 2 ? "#0f172a" : "#64748b", fontWeight: i === 2 ? 700 : 400 }}>{row}</td>
                      <td style={{ textAlign: "right", padding: "5px 0", fontWeight: i === 2 ? 700 : 400 }}>{gas} ฿</td>
                      <td style={{ textAlign: "right", padding: "5px 0", fontWeight: i === 2 ? 700 : 400 }}>{ev} ฿</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: "2px solid #e2e8f0" }}>
                    <td style={{ padding: "6px 0", color: "#64748b" }}>Saving/km</td>
                    <td colSpan={2} style={{ textAlign: "right", fontWeight: 700, color: result.savingsPerKm > 0 ? EV : GAS }}>
                      {result.savingsPerKm > 0 ? "EV saves" : "Gas saves"} {Math.abs(result.savingsPerKm).toFixed(2)} ฿
                    </td>
                  </tr>
                </tbody>
              </table>
            </Card>

            <div style={{ textAlign: "center", fontSize: 11, color: "#cbd5e1", paddingTop: 4 }}>
              All figures in Thai Baht (฿)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
