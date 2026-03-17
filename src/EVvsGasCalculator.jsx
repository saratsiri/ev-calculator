import { useState, useMemo } from "react";

const defaults = {
  // Gasoline
  gasCityEfficiency: 7,
  gasHighwayEfficiency: 11,
  fuelPrice: 30,
  gasInsurance: 15000,
  gasTax: 5000,
  gasOilChange: 5000,
  gasMaintenance: 10000,
  gasDepreciation: 100000,
  gasDepreciationYears: 3,

  // EV
  evCityEfficiency: 11,
  evHighwayEfficiency: 15,
  evHomePricePerKwh: 2.5,
  evPublicPricePerKwh: 5,
  evInsurance: 40000,
  evTax: 0,
  evMaintenance: 0,
  evDepreciation: 100000,
  evDepreciationYears: 1,

  // Driving
  workCommuteKm: 1000,
  leisureDriveKm: 2000,
};

function InputField({ label, unit, value, onChange, step = 1, min = 0 }) {
  return (
    <div style={{ marginBottom: "10px" }}>
      <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "13px", color: "#c0c0c0", flex: 1 }}>{label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            step={step}
            min={min}
            style={{
              width: "90px",
              padding: "6px 8px",
              background: "#1a1a2e",
              border: "1px solid #2a2a4a",
              borderRadius: "6px",
              color: "#e0e0e0",
              fontSize: "13px",
              textAlign: "right",
              outline: "none",
            }}
          />
          {unit && <span style={{ fontSize: "11px", color: "#888", minWidth: "45px" }}>{unit}</span>}
        </div>
      </label>
    </div>
  );
}

function Section({ title, color, children }) {
  return (
    <div style={{
      background: "#0f0f1e",
      borderRadius: "12px",
      padding: "16px",
      border: `1px solid ${color}22`,
    }}>
      <h3 style={{
        margin: "0 0 12px 0",
        fontSize: "14px",
        fontWeight: 700,
        color: color,
        textTransform: "uppercase",
        letterSpacing: "1.5px",
      }}>{title}</h3>
      {children}
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

    // Per-km costs
    const gasCityPerKm = v.fuelPrice / v.gasCityEfficiency;
    const gasHwyPerKm = v.fuelPrice / v.gasHighwayEfficiency;

    const evCityPerKm = (v.evCityEfficiency / 100) * v.evHomePricePerKwh;
    const evHwyPerKm = (v.evHighwayEfficiency / 100) * v.evPublicPricePerKwh;

    // Annual energy costs by use case
    const gasWorkEnergy = gasCityPerKm * workKmYear;
    const gasLeisureEnergy = gasHwyPerKm * leisureKmYear;
    const gasTotalEnergy = gasWorkEnergy + gasLeisureEnergy;

    const evWorkEnergy = evCityPerKm * workKmYear;
    const evLeisureEnergy = evHwyPerKm * leisureKmYear;
    const evTotalEnergy = evWorkEnergy + evLeisureEnergy;

    // Blended per-km (for chart line slope)
    const cityFrac = totalKmYear > 0 ? workKmYear / totalKmYear : 0.5;
    const hwyFrac = 1 - cityFrac;
    const gasBlended = gasCityPerKm * cityFrac + gasHwyPerKm * hwyFrac;
    const evBlended = evCityPerKm * cityFrac + evHwyPerKm * hwyFrac;
    const savingsPerKm = gasBlended - evBlended;

    // Annual fixed costs
    const gasFixed = v.gasInsurance + v.gasTax + v.gasOilChange + v.gasMaintenance + (v.gasDepreciation / v.gasDepreciationYears);
    const evFixed = v.evInsurance + v.evTax + v.evMaintenance + (v.evDepreciation / v.evDepreciationYears);
    const fixedDelta = evFixed - gasFixed;

    // Crossover
    let crossoverKmYear = null;
    let crossoverKmMonth = null;
    if (savingsPerKm > 0 && fixedDelta > 0) {
      crossoverKmYear = fixedDelta / savingsPerKm;
      crossoverKmMonth = crossoverKmYear / 12;
    }

    // Current scenario costs
    const gasAnnual = gasFixed + gasTotalEnergy;
    const evAnnual = evFixed + evTotalEnergy;
    const monthlyKm = v.workCommuteKm + v.leisureDriveKm;

    return {
      gasCityPerKm,
      gasHwyPerKm,
      gasBlended,
      evCityPerKm,
      evHwyPerKm,
      evBlended,
      savingsPerKm,
      gasFixed,
      evFixed,
      fixedDelta,
      crossoverKmYear,
      crossoverKmMonth,
      gasAnnual,
      evAnnual,
      annualKm: totalKmYear,
      monthlyKm,
      gasWorkEnergy,
      gasLeisureEnergy,
      evWorkEnergy,
      evLeisureEnergy,
      winner: gasAnnual < evAnnual ? "gas" : "ev",
      savings: Math.abs(gasAnnual - evAnnual),
    };
  }, [v]);

  const evWinsAlways = result.savingsPerKm > 0 && result.fixedDelta <= 0;
  const gasWinsAlways = result.savingsPerKm <= 0;

  // Chart data
  const maxKm = Math.max((result.crossoverKmYear || 50000) * 1.5, result.annualKm * 1.3, 60000);
  const chartPoints = 50;

  function costAt(km, fixed, perKm) { return fixed + perKm * km; }

  const svgW = 500, svgH = 200, pad = { t: 10, r: 10, b: 30, l: 55 };
  const plotW = svgW - pad.l - pad.r;
  const plotH = svgH - pad.t - pad.b;

  const maxCost = costAt(maxKm, Math.max(result.gasFixed, result.evFixed), Math.max(result.gasBlended, result.evBlended));
  const xScale = (km) => pad.l + (km / maxKm) * plotW;
  const yScale = (cost) => pad.t + plotH - (cost / maxCost) * plotH;

  const gasLine = Array.from({ length: chartPoints + 1 }, (_, i) => {
    const km = (i / chartPoints) * maxKm;
    return `${xScale(km)},${yScale(costAt(km, result.gasFixed, result.gasBlended))}`;
  }).join(" ");

  const evLine = Array.from({ length: chartPoints + 1 }, (_, i) => {
    const km = (i / chartPoints) * maxKm;
    return `${xScale(km)},${yScale(costAt(km, result.evFixed, result.evBlended))}`;
  }).join(" ");

  const fmt = (n) => Math.round(n).toLocaleString();

  return (
    <div style={{
      fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
      background: "#0a0a18",
      color: "#e0e0e0",
      minHeight: "100vh",
      padding: "20px",
    }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <h1 style={{
            fontSize: "22px",
            fontWeight: 800,
            margin: 0,
            background: "linear-gradient(135deg, #f97316, #22d3ee)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "1px",
          }}>EV vs GASOLINE</h1>
          <p style={{ color: "#666", fontSize: "12px", margin: "4px 0 0", letterSpacing: "2px", textTransform: "uppercase" }}>
            Crossover Mileage Calculator
          </p>
        </div>

        {/* Result Banner */}
        <div style={{
          background: evWinsAlways ? "#22d3ee11" : gasWinsAlways ? "#f9731611" : result.crossoverKmMonth ? "#1a1a2e" : "#1a1a2e",
          border: `1px solid ${evWinsAlways ? "#22d3ee44" : gasWinsAlways ? "#f9731644" : "#2a2a4a"}`,
          borderRadius: "12px",
          padding: "16px",
          marginBottom: "16px",
          textAlign: "center",
        }}>
          {evWinsAlways ? (
            <div>
              <div style={{ fontSize: "18px", fontWeight: 800, color: "#22d3ee" }}>⚡ EV WINS AT ANY MILEAGE</div>
              <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
                EV has lower fixed costs AND lower per-km costs
              </div>
            </div>
          ) : gasWinsAlways ? (
            <div>
              <div style={{ fontSize: "18px", fontWeight: 800, color: "#f97316" }}>⛽ GASOLINE ALWAYS CHEAPER</div>
              <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
                Gasoline per-km cost is equal or lower — no crossover exists
              </div>
            </div>
          ) : result.crossoverKmMonth ? (
            <div>
              <div style={{ fontSize: "11px", color: "#888", letterSpacing: "2px", textTransform: "uppercase" }}>Crossover Point</div>
              <div style={{ fontSize: "28px", fontWeight: 800, color: "#22d3ee", margin: "4px 0" }}>
                {fmt(result.crossoverKmMonth)} km/month
              </div>
              <div style={{ fontSize: "13px", color: "#aaa" }}>
                ({fmt(result.crossoverKmYear)} km/year · {fmt(result.crossoverKmYear / 365)} km/day)
              </div>
              <div style={{ fontSize: "12px", color: "#666", marginTop: "6px" }}>
                Below this → ⛽ Gasoline wins · Above this → ⚡ EV wins
              </div>
            </div>
          ) : (
            <div style={{ fontSize: "14px", color: "#888" }}>Adjust parameters to calculate</div>
          )}
        </div>

        {/* Your Scenario */}
        <div style={{
          background: "#0f0f1e",
          borderRadius: "12px",
          padding: "16px",
          marginBottom: "16px",
          border: `1px solid ${result.winner === "ev" ? "#22d3ee" : "#f97316"}33`,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
            <span style={{ fontSize: "11px", color: "#888", letterSpacing: "2px", textTransform: "uppercase" }}>
              Your Scenario ({fmt(result.monthlyKm)} km/mo)
            </span>
            <span style={{
              fontSize: "11px",
              padding: "2px 8px",
              borderRadius: "4px",
              background: result.winner === "ev" ? "#22d3ee22" : "#f9731622",
              color: result.winner === "ev" ? "#22d3ee" : "#f97316",
              fontWeight: 700,
            }}>
              {result.winner === "ev" ? "⚡ EV SAVES" : "⛽ GAS SAVES"} {fmt(result.savings)} ฿/yr
            </span>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <div style={{ flex: 1, background: "#f9731611", borderRadius: "8px", padding: "10px", textAlign: "center" }}>
              <div style={{ fontSize: "11px", color: "#f97316", marginBottom: "4px" }}>⛽ Gasoline</div>
              <div style={{ fontSize: "18px", fontWeight: 700 }}>{fmt(result.gasAnnual)} <span style={{ fontSize: "11px", color: "#888" }}>฿/yr</span></div>
              <div style={{ fontSize: "11px", color: "#888" }}>{fmt(result.gasAnnual / 12)} ฿/mo</div>
            </div>
            <div style={{ flex: 1, background: "#22d3ee11", borderRadius: "8px", padding: "10px", textAlign: "center" }}>
              <div style={{ fontSize: "11px", color: "#22d3ee", marginBottom: "4px" }}>⚡ EV</div>
              <div style={{ fontSize: "18px", fontWeight: 700 }}>{fmt(result.evAnnual)} <span style={{ fontSize: "11px", color: "#888" }}>฿/yr</span></div>
              <div style={{ fontSize: "11px", color: "#888" }}>{fmt(result.evAnnual / 12)} ฿/mo</div>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div style={{
          background: "#0f0f1e",
          borderRadius: "12px",
          padding: "16px",
          marginBottom: "16px",
          border: "1px solid #1a1a3a",
        }}>
          <div style={{ fontSize: "11px", color: "#888", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "8px" }}>
            Annual Cost vs Distance
          </div>
          <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: "100%", height: "auto" }}>
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((f) => (
              <g key={f}>
                <line x1={pad.l} x2={svgW - pad.r} y1={pad.t + plotH * (1 - f)} y2={pad.t + plotH * (1 - f)} stroke="#1a1a3a" strokeWidth="0.5" />
                <text x={pad.l - 5} y={pad.t + plotH * (1 - f) + 3} textAnchor="end" fill="#555" fontSize="8" fontFamily="monospace">
                  {fmt(maxCost * f)}
                </text>
              </g>
            ))}
            {[0, 0.25, 0.5, 0.75, 1].map((f) => (
              <g key={f}>
                <text x={xScale(maxKm * f)} y={svgH - 5} textAnchor="middle" fill="#555" fontSize="8" fontFamily="monospace">
                  {fmt(maxKm * f)}
                </text>
              </g>
            ))}

            {/* Lines */}
            <polyline points={gasLine} fill="none" stroke="#f97316" strokeWidth="2" />
            <polyline points={evLine} fill="none" stroke="#22d3ee" strokeWidth="2" />

            {/* Crossover dot */}
            {result.crossoverKmYear && result.crossoverKmYear < maxKm && (
              <circle
                cx={xScale(result.crossoverKmYear)}
                cy={yScale(costAt(result.crossoverKmYear, result.gasFixed, result.gasBlended))}
                r="4" fill="#fff" stroke="#0a0a18" strokeWidth="1.5"
              />
            )}

            {/* Current mileage line */}
            <line
              x1={xScale(result.annualKm)} x2={xScale(result.annualKm)}
              y1={pad.t} y2={pad.t + plotH}
              stroke="#ffffff33" strokeWidth="1" strokeDasharray="4,3"
            />
            <text x={xScale(result.annualKm)} y={pad.t + plotH + 15} textAnchor="middle" fill="#888" fontSize="7" fontFamily="monospace">
              YOU
            </text>

            {/* Legend */}
            <circle cx={svgW - pad.r - 90} cy={pad.t + 8} r="4" fill="#f97316" />
            <text x={svgW - pad.r - 82} y={pad.t + 11} fill="#f97316" fontSize="8" fontFamily="monospace">Gasoline</text>
            <circle cx={svgW - pad.r - 90} cy={pad.t + 22} r="4" fill="#22d3ee" />
            <text x={svgW - pad.r - 82} y={pad.t + 25} fill="#22d3ee" fontSize="8" fontFamily="monospace">EV</text>

            {/* Axis labels */}
            <text x={svgW / 2} y={svgH - 0} textAnchor="middle" fill="#555" fontSize="8" fontFamily="monospace">km/year</text>
          </svg>
        </div>

        {/* Per-km Breakdown */}
        <div style={{
          background: "#0f0f1e",
          borderRadius: "12px",
          padding: "16px",
          marginBottom: "16px",
          border: "1px solid #1a1a3a",
        }}>
          <div style={{ fontSize: "11px", color: "#888", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "10px" }}>
            Energy Cost Per Kilometer
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", fontSize: "12px" }}>
            <div></div>
            <div style={{ textAlign: "center", color: "#f97316", fontWeight: 700, fontSize: "11px" }}>⛽ GAS</div>
            <div style={{ textAlign: "center", color: "#22d3ee", fontWeight: 700, fontSize: "11px" }}>⚡ EV</div>

            <div style={{ color: "#888" }}>City</div>
            <div style={{ textAlign: "center" }}>{result.gasCityPerKm.toFixed(2)} ฿</div>
            <div style={{ textAlign: "center" }}>{result.evCityPerKm.toFixed(3)} ฿</div>

            <div style={{ color: "#888" }}>Highway</div>
            <div style={{ textAlign: "center" }}>{result.gasHwyPerKm.toFixed(2)} ฿</div>
            <div style={{ textAlign: "center" }}>{result.evHwyPerKm.toFixed(3)} ฿</div>

            <div style={{ color: "#888", fontWeight: 700 }}>Blended</div>
            <div style={{ textAlign: "center", fontWeight: 700 }}>{result.gasBlended.toFixed(2)} ฿</div>
            <div style={{ textAlign: "center", fontWeight: 700 }}>{result.evBlended.toFixed(3)} ฿</div>

            <div style={{ color: "#888" }}>Saving/km</div>
            <div style={{ textAlign: "center", gridColumn: "2/4", color: result.savingsPerKm > 0 ? "#22d3ee" : "#f97316", fontWeight: 700 }}>
              {result.savingsPerKm > 0 ? "EV saves" : "Gas saves"} {Math.abs(result.savingsPerKm).toFixed(2)} ฿/km
            </div>
          </div>
        </div>

        {/* Driving Inputs */}
        <div style={{
          background: "#0f0f1e",
          borderRadius: "12px",
          padding: "16px",
          marginBottom: "12px",
          border: "1px solid #1a1a3a",
        }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: 700, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "1.5px" }}>
            Your Driving
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <InputField label="Work commute (city)" unit="km/mo" value={v.workCommuteKm} onChange={set("workCommuteKm")} step={100} />
            <InputField label="Leisure drive (hwy)" unit="km/mo" value={v.leisureDriveKm} onChange={set("leisureDriveKm")} step={100} />
          </div>
          <div style={{ fontSize: "11px", color: "#666", marginTop: "4px", textAlign: "center" }}>
            Total: {fmt(v.workCommuteKm + v.leisureDriveKm)} km/month · {fmt((v.workCommuteKm + v.leisureDriveKm) * 12)} km/year
          </div>
        </div>

        {/* Cost Breakdown */}
        <div style={{
          background: "#0f0f1e",
          borderRadius: "12px",
          padding: "16px",
          marginBottom: "12px",
          border: "1px solid #1a1a3a",
        }}>
          <div style={{ fontSize: "11px", color: "#888", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "10px" }}>
            Annual Energy Cost Breakdown
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px", fontSize: "12px" }}>
            <div></div>
            <div style={{ textAlign: "center", color: "#f97316", fontWeight: 700, fontSize: "11px" }}>⛽ GAS</div>
            <div style={{ textAlign: "center", color: "#22d3ee", fontWeight: 700, fontSize: "11px" }}>⚡ EV</div>

            <div style={{ color: "#888" }}>Work commute</div>
            <div style={{ textAlign: "center" }}>{fmt(result.gasWorkEnergy)} ฿</div>
            <div style={{ textAlign: "center" }}>{fmt(result.evWorkEnergy)} ฿</div>

            <div style={{ color: "#888" }}>Leisure drive</div>
            <div style={{ textAlign: "center" }}>{fmt(result.gasLeisureEnergy)} ฿</div>
            <div style={{ textAlign: "center" }}>{fmt(result.evLeisureEnergy)} ฿</div>

            <div style={{ color: "#888", fontWeight: 700, borderTop: "1px solid #1a1a3a", paddingTop: "4px" }}>Total energy</div>
            <div style={{ textAlign: "center", fontWeight: 700, borderTop: "1px solid #1a1a3a", paddingTop: "4px" }}>{fmt(result.gasWorkEnergy + result.gasLeisureEnergy)} ฿</div>
            <div style={{ textAlign: "center", fontWeight: 700, borderTop: "1px solid #1a1a3a", paddingTop: "4px" }}>{fmt(result.evWorkEnergy + result.evLeisureEnergy)} ฿</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <Section title="⛽ Gasoline" color="#f97316">
            <InputField label="Fuel price" unit="฿/L" value={v.fuelPrice} onChange={set("fuelPrice")} step={0.5} />
            <InputField label="City efficiency" unit="km/L" value={v.gasCityEfficiency} onChange={set("gasCityEfficiency")} step={0.5} />
            <InputField label="Hwy efficiency" unit="km/L" value={v.gasHighwayEfficiency} onChange={set("gasHighwayEfficiency")} step={0.5} />
            <InputField label="Insurance" unit="฿/yr" value={v.gasInsurance} onChange={set("gasInsurance")} step={1000} />
            <InputField label="Tax" unit="฿/yr" value={v.gasTax} onChange={set("gasTax")} step={500} />
            <InputField label="Oil changes" unit="฿/yr" value={v.gasOilChange} onChange={set("gasOilChange")} step={500} />
            <InputField label="Maintenance" unit="฿/yr" value={v.gasMaintenance} onChange={set("gasMaintenance")} step={1000} />
            <InputField label="Depreciation" unit="฿" value={v.gasDepreciation} onChange={set("gasDepreciation")} step={10000} />
            <InputField label="Deprec. period" unit="years" value={v.gasDepreciationYears} onChange={set("gasDepreciationYears")} step={1} min={1} />
          </Section>

          <Section title="⚡ EV" color="#22d3ee">
            <InputField label="Home elec. price" unit="฿/kWh" value={v.evHomePricePerKwh} onChange={set("evHomePricePerKwh")} step={0.1} />
            <InputField label="Public elec. price" unit="฿/kWh" value={v.evPublicPricePerKwh} onChange={set("evPublicPricePerKwh")} step={0.5} />
            <InputField label="City consumption" unit="kWh/100km" value={v.evCityEfficiency} onChange={set("evCityEfficiency")} step={0.5} />
            <InputField label="Hwy consumption" unit="kWh/100km" value={v.evHighwayEfficiency} onChange={set("evHighwayEfficiency")} step={0.5} />
            <InputField label="Insurance" unit="฿/yr" value={v.evInsurance} onChange={set("evInsurance")} step={1000} />
            <InputField label="Tax" unit="฿/yr" value={v.evTax} onChange={set("evTax")} step={500} />
            <InputField label="Maintenance" unit="฿/yr" value={v.evMaintenance} onChange={set("evMaintenance")} step={1000} />
            <InputField label="Depreciation" unit="฿" value={v.evDepreciation} onChange={set("evDepreciation")} step={10000} />
            <InputField label="Deprec. period" unit="years" value={v.evDepreciationYears} onChange={set("evDepreciationYears")} step={1} min={1} />
          </Section>
        </div>

        <div style={{ textAlign: "center", padding: "16px 0 8px", fontSize: "10px", color: "#444" }}>
          All figures in Thai Baht (฿)
        </div>
      </div>
    </div>
  );
}
