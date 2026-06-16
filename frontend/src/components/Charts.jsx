import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend,
} from 'recharts'

const TOOLTIP_STYLE = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--text-primary)',
}

/* ── Completitud por columna ──────────────────────────────────────────────── */
export function CompletenessChart({ columnInfo = [] }) {
  const data = columnInfo.map(c => ({
    name: c.name.length > 12 ? c.name.slice(0, 12) + '…' : c.name,
    completitud: Math.round((1 - c.missing_pct / 100) * 100),
    fullName: c.name,
  }))

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(v, _, props) => [`${v}%`, props.payload.fullName]}
          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
        />
        <Bar dataKey="completitud" radius={[4, 4, 0, 0]} maxBarSize={40}>
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={d.completitud >= 90 ? 'var(--accent)' : d.completitud >= 70 ? 'var(--amber)' : 'var(--red)'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/* ── Distribución numérica (histograma) ───────────────────────────────────── */
export function HistogramChart({ stats, name }) {
  if (!stats) return null
  // Simular distribución normal desde stats
  const { min, max, q25, median, q75, mean } = stats
  const points = [
    { x: min.toFixed(1),    y: 5 },
    { x: q25.toFixed(1),    y: 35 },
    { x: median.toFixed(1), y: 60 },
    { x: mean.toFixed(1),   y: 55 },
    { x: q75.toFixed(1),    y: 30 },
    { x: max.toFixed(1),    y: 5 },
  ]

  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={points} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <XAxis dataKey="x" tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
        <YAxis hide />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(v) => [v, 'frecuencia']}
          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
        />
        <Bar dataKey="y" fill="var(--accent)" radius={[3, 3, 0, 0]} maxBarSize={30} opacity={0.8} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/* ── Tipos de columnas (donut) ────────────────────────────────────────────── */
export function ColumnTypesChart({ numericCols, categoricalCols }) {
  const data = [
    { name: 'Numéricas',    value: numericCols,    color: 'var(--accent)' },
    { name: 'Categóricas',  value: categoricalCols, color: 'var(--violet)' },
  ].filter(d => d.value > 0)

  return (
    <ResponsiveContainer width="100%" height={140}>
      <PieChart>
        <Pie
          data={data}
          cx="50%" cy="50%"
          innerRadius={38} outerRadius={58}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Pie>
        <Legend
          iconType="circle" iconSize={8}
          formatter={(v) => <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{v}</span>}
        />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
      </PieChart>
    </ResponsiveContainer>
  )
}
