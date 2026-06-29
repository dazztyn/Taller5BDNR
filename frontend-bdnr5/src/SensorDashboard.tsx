import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Thermometer, Droplets, AlertTriangle, CheckCircle, Wifi, WifiOff, Trash2, Clock } from 'lucide-react';


interface DatosSensor {
  deviceId: string;
  temperatura: number;
  humedad: number;
  nivelAgua: number; 
  timestamp: Date;
}

interface Alert {
  id: string;
  type: 'danger' | 'warning';
  message: string;
  timestamp: Date;
}

interface PromedioPorHora {
  hora: string;
  promedio: number;
  cantidad: number;
}

const URLBackend = import.meta.env.VITE_API_URL;
const LimiteAlertaTemp = 30;
const LimiteAlertaAgua = 1;
const HistorialMax = 10;
const MaxPuntosChart = 30;
const MAX_ALERTS = 20;

function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatHour(date: Date): string {
  return `${date.getHours().toString().padStart(2, '0')}:00`;
}

function NivelAgua({ level }: { level: number }) {
  const maxLevel = 4;
  const pct = Math.round((level / maxLevel) * 100);
  const isLow = level <= LimiteAlertaAgua;

  const color = isLow
    ? '#e24b4a'
    : level <= 2
    ? '#eda100'
    : '#1d9e75';

  const bgColor = isLow
    ? '#fcebeb'
    : level <= 2
    ? '#faeeda'
    : '#e1f5ee';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 120,
          borderRadius: 12,
          border: `2px solid ${color}`,
          overflow: 'hidden',
          background: '#f8f8f6',
        }}
        role="img"
        aria-label={`Nivel de agua: ${level} de 4 (${pct}%)`}
      >
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: `${pct}%`,
            background: color,
            opacity: 0.2,
            transition: 'height 0.6s ease',
          }}
        />
        {[1, 2, 3].map((l) => (
          <div
            key={l}
            style={{
              position: 'absolute',
              bottom: `${(l / maxLevel) * 100}%`,
              left: 0,
              right: 0,
              borderTop: '1px dashed rgba(0,0,0,0.15)',
            }}
          />
        ))}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 32, fontWeight: 500, color, lineHeight: 1 }}>{level}</span>
          <span style={{ fontSize: 12, color: '#888', marginTop: 2 }}>de {maxLevel}</span>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
        {Array.from({ length: maxLevel }).map((_, i) => {
          const filled = i < level;
          const isCurrent = i === level - 1;
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: 28,
                borderRadius: 6,
                background: filled ? color : '#e5e4de',
                opacity: isCurrent ? 1 : filled ? 0.6 : 0.3,
                transition: 'background 0.4s ease',
              }}
              aria-hidden="true"
            />
          );
        })}
      </div>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          borderRadius: 8,
          background: bgColor,
          color,
          fontSize: 13,
          fontWeight: 500,
          alignSelf: 'flex-start',
        }}
      >
        {isLow ? (
          <AlertTriangle size={14} aria-hidden="true" />
        ) : (
          <Droplets size={14} aria-hidden="true" />
        )}
        {isLow ? 'Nivel bajo — revisar' : level <= 2 ? 'Nivel medio' : 'Nivel óptimo'}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  unit,
  icon,
  alert,
}: {
  label: string;
  value: number | null;
  unit: string;
  icon: React.ReactNode;
  alert?: boolean;
}) {
  const bg = alert ? '#fcebeb' : 'var(--surface-1, #f8f8f6)';
  const textColor = alert ? '#a32d2d' : 'var(--text-primary, #0b0b0b)';

  return (
    <div
      style={{
        background: bg,
        borderRadius: 12,
        border: `0.5px solid ${alert ? '#f7c1c1' : 'rgba(0,0,0,0.08)'}`,
        padding: '1rem 1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        transition: 'background 0.3s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: alert ? '#e24b4a' : '#888' }}>
        {icon}
        <span style={{ fontSize: 13, color: alert ? '#a32d2d' : '#888780' }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: 32, fontWeight: 500, color: textColor, lineHeight: 1 }}>
          {value !== null ? value.toFixed(1) : '—'}
        </span>
        <span style={{ fontSize: 14, color: alert ? '#a32d2d' : '#888780' }}>{unit}</span>
      </div>
    </div>
  );
}

function AlertRow({ alert }: { alert: Alert }) {
  const isDanger = alert.type === 'danger';
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 8,
        background: isDanger ? '#fcebeb' : '#faeeda',
        borderLeft: `3px solid ${isDanger ? '#e24b4a' : '#eda100'}`,
        fontSize: 13,
      }}
    >
      <AlertTriangle
        size={15}
        style={{ color: isDanger ? '#e24b4a' : '#eda100', flexShrink: 0, marginTop: 1 }}
        aria-hidden="true"
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, color: isDanger ? '#791f1f' : '#633806', fontWeight: 500 }}>{alert.message}</p>
        <p style={{ margin: '2px 0 0', color: isDanger ? '#a32d2d' : '#854f0b', opacity: 0.7, fontSize: 12 }}>
          {formatTime(alert.timestamp)}
        </p>
      </div>
    </div>
  );
}

export default function SensorDashboard() {
  const [connected, setConnected] = useState(false);
  const [history, setHistory] = useState<DatosSensor[]>([]);
  const [chartData, setChartData] = useState<(DatosSensor & { time: string })[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [PromediosPorHora, setPromediosPorHora] = useState<PromedioPorHora[]>([]);
  const [resetting, setResetting] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  
  const recalcPromediosPorHora = useCallback((data: DatosSensor[]) => {
    const byHour: Record<string, number[]> = {};
    data.forEach((d) => {
      const hora = formatHour(d.timestamp);
      if (!byHour[hora]) byHour[hora] = [];
      byHour[hora].push(d.temperatura);
    });
    const avgs: PromedioPorHora[] = Object.entries(byHour).map(([hora, temps]) => ({
      hora,
      promedio: parseFloat((temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1)),
      cantidad: temps.length,
    }));
    setPromediosPorHora(avgs.slice(-12)); 
  }, []);

  const handleNewData = useCallback(
    (raw: Omit<DatosSensor, 'timestamp'>) => {
      const dato: DatosSensor = { ...raw, timestamp: new Date() };

      setHistory((prev) => [dato, ...prev].slice(0, HistorialMax));

      const chartPoint = { ...dato, time: formatTime(dato.timestamp) };
      setChartData((prev) => [...prev, chartPoint].slice(-MaxPuntosChart));

      setHistory((prev) => {
        recalcPromediosPorHora(prev);
        return prev;
      });

      const newAlerts: Alert[] = [];
      if (dato.temperatura > LimiteAlertaTemp) {
        newAlerts.push({
          id: `temp-${Date.now()}`,
          type: 'danger',
          message: `Temperatura crítica en ${dato.deviceId}: ${dato.temperatura.toFixed(1)}°C (umbral: ${LimiteAlertaTemp}°C)`,
          timestamp: dato.timestamp,
        });
      }
      if (dato.nivelAgua <= LimiteAlertaAgua) {
        newAlerts.push({
          id: `water-${Date.now()}`,
          type: 'warning',
          message: `Nivel de agua bajo en ${dato.deviceId}: nivel ${dato.nivelAgua}/4`,
          timestamp: dato.timestamp,
        });
      }
      if (newAlerts.length > 0) {
        setAlerts((prev) => [...newAlerts, ...prev].slice(0, MAX_ALERTS));
      }
    },
    [recalcPromediosPorHora]
  );

  useEffect(() => {
    const socket = io(URLBackend, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('nuevos-datos-iot', handleNewData);

    socket.on('datos-borrados', () => {
      setHistory([]);
      setChartData([]);
      setPromediosPorHora([]);
      setAlerts([]);
    });

    return () => {
      socket.disconnect();
    };
  }, [handleNewData]);

  const latest = history[0] ?? null;
  const tempAlert = latest !== null && latest.temperatura > LimiteAlertaTemp;
  const waterAlert = latest !== null && latest.nivelAgua <= LimiteAlertaAgua;

  async function handleReset() {
    if (!window.confirm('¿Reiniciar todo el historial? Esta acción no se puede deshacer.')) return;
    setResetting(true);
    try {
      await fetch(`${URLBackend}/sensor-data/all`, { method: 'DELETE' });
    } catch {
      console.error('Error al reiniciar');
    } finally {
      setResetting(false);
    }
  }
useEffect(() => {
  async function cargarDatosIniciales() {
    try {
      const [latest, history, stats, global] = await Promise.all([
        fetch(`${URLBackend}/sensor-data/latest`).then(r => r.json()),
        fetch(`${URLBackend}/sensor-data/history`).then(r => r.json()),
        fetch(`${URLBackend}/sensor-data/stats`).then(r => r.json()),
        fetch(`${URLBackend}/sensor-data/global`).then(r => r.json()),
      ]);

      if (Array.isArray(history) && history.length > 0) {
        const parsed: DatosSensor[] = history.map((d: any) => ({
          deviceId: d.deviceId,
          temperatura: d.temperatura,
          humedad: d.humedad,
          nivelAgua: d.nivelAgua,
          timestamp: new Date(d.createdAt),
        }));
        setHistory(parsed);
      }

      if (Array.isArray(global) && global.length > 0) {
        const parsed = global.map((d: any) => ({
          deviceId: d.deviceId,
          temperatura: d.temperatura,
          humedad: d.humedad,
          nivelAgua: d.nivelAgua,
          timestamp: new Date(d.createdAt),
          time: formatTime(new Date(d.createdAt)),
        }));
        setChartData(parsed.slice(-MaxPuntosChart));
      }

      if (Array.isArray(stats) && stats.length > 0) {
        const promedios: PromedioPorHora[] = stats.map((s: any) => ({
          hora: `${String(s._id.hour).padStart(2, '0')}:00`,
          promedio: parseFloat(s.promedioTemperatura.toFixed(1)),
          cantidad: 0, 
        }));
        setPromediosPorHora(promedios.slice(-12));
      }

      if (latest && history.length === 0) {
        const dato: DatosSensor = {
          deviceId: latest.deviceId,
          temperatura: latest.temperatura,
          humedad: latest.humedad,
          nivelAgua: latest.nivelAgua,
          timestamp: new Date(),
        };
        setHistory([dato]);
      }

    } catch (err) {
      console.error('Error cargando datos iniciales:', err);
    }
  }

  cargarDatosIniciales();
}, []); 
  const sectionTitle: React.CSSProperties = {
    fontSize: 15,
    fontWeight: 500,
    color: 'var(--text-primary, #0b0b0b)',
    marginBottom: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  };

  const card: React.CSSProperties = {
    background: 'var(--surface-2, #ffffff)',
    borderRadius: 12,
    border: '0.5px solid rgba(0,0,0,0.08)',
    padding: '1.25rem',
  };

  return (
    <div
      style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        maxWidth: 1200,
        margin: '0 auto',
        padding: '1.5rem',
        color: 'var(--text-primary, #0b0b0b)',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 500 }}>Monitor IoT</h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#888780' }}>
            Temperatura · Humedad · Nivel de agua
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 8,
              background: connected ? '#e1f5ee' : '#fcebeb',
              color: connected ? '#0f6e56' : '#a32d2d',
              fontSize: 13,
              fontWeight: 500,
            }}
            aria-live="polite"
          >
            {connected ? <Wifi size={14} aria-hidden="true" /> : <WifiOff size={14} aria-hidden="true" />}
            {connected ? 'Conectado' : 'Desconectado'}
          </div>

          <button
            onClick={handleReset}
            disabled={resetting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 8,
              border: '0.5px solid rgba(0,0,0,0.15)',
              background: 'transparent',
              fontSize: 13,
              cursor: resetting ? 'not-allowed' : 'pointer',
              color: '#888780',
              opacity: resetting ? 0.5 : 1,
            }}
          >
            <Trash2 size={14} aria-hidden="true" />
            {resetting ? 'Reiniciando…' : 'Reiniciar'}
          </button>
        </div>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 12,
          marginBottom: '1.5rem',
        }}
      >
        <MetricCard
          label="Temperatura"
          value={latest?.temperatura ?? null}
          unit="°C"
          icon={<Thermometer size={15} aria-hidden="true" />}
          alert={tempAlert}
        />
        <MetricCard
          label="Humedad"
          value={latest?.humedad ?? null}
          unit="%"
          icon={<Droplets size={15} aria-hidden="true" />}
        />
        <div
          style={{
            background: 'var(--surface-1, #f8f8f6)',
            borderRadius: 12,
            border: '0.5px solid rgba(0,0,0,0.08)',
            padding: '1rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <span style={{ fontSize: 13, color: '#888780' }}>Dispositivo</span>
          <span style={{ fontSize: 18, fontWeight: 500, color: 'var(--text-primary, #0b0b0b)' }}>
            {latest?.deviceId ?? '—'}
          </span>
          {latest && (
            <span style={{ fontSize: 11, color: '#888780', marginTop: 2 }}>
              {formatTime(latest.timestamp)}
            </span>
          )}
        </div>
        <div
          style={{
            background: 'var(--surface-1, #f8f8f6)',
            borderRadius: 12,
            border: '0.5px solid rgba(0,0,0,0.08)',
            padding: '1rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <span style={{ fontSize: 13, color: '#888780' }}>Lecturas totales</span>
          <span style={{ fontSize: 32, fontWeight: 500, color: 'var(--text-primary, #0b0b0b)', lineHeight: 1 }}>
            {chartData.length}
          </span>
          <span style={{ fontSize: 11, color: '#888780', marginTop: 2 }}>en esta sesión</span>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 280px',
          gap: '1rem',
          marginBottom: '1rem',
        }}
      >
        <div style={card}>
          <h2 style={sectionTitle}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: connected ? '#1d9e75' : '#e24b4a',
                display: 'inline-block',
                flexShrink: 0,
              }}
              aria-hidden="true"
            />
            Datos en tiempo real
          </h2>
          {chartData.length === 0 ? (
            <div
              style={{
                height: 260,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#888780',
                fontSize: 14,
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <Wifi size={28} style={{ opacity: 0.3 }} aria-hidden="true" />
              <span>Esperando datos del sensor…</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart
                data={chartData}
                aria-label="Gráfico de temperatura y humedad en tiempo real"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 11, fill: '#888780' }}
                  tickLine={false}
                  axisLine={{ stroke: '#c3c2b7' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#888780' }}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                />
                <Tooltip
                  contentStyle={{
                    border: '0.5px solid rgba(0,0,0,0.1)',
                    borderRadius: 8,
                    fontSize: 12,
                    background: '#fff',
                  }}
                  formatter={(value, name) => [
                    `${Number(value).toFixed(1)}${name === 'temperatura' ? '°C' : '%'}`,
                    name === 'temperatura' ? 'Temperatura' : 'Humedad',
                  ] as [string, string]}
                />
                <Legend
                  formatter={(value) => (value === 'temperatura' ? 'Temperatura' : 'Humedad')}
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                />

                <Line
                  type="monotone"
                  dataKey="temperatura"
                  stroke="#2a78d6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
                />
                <Line
                  type="monotone"
                  dataKey="humedad"
                  stroke="#1baf7a"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="5 3"
                  activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
          {tempAlert && (
            <div
              style={{
                marginTop: 8,
                padding: '6px 10px',
                background: '#fcebeb',
                borderRadius: 6,
                fontSize: 12,
                color: '#a32d2d',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <AlertTriangle size={12} aria-hidden="true" />
              Temperatura por encima del umbral de {LimiteAlertaTemp}°C
            </div>
          )}
        </div>
        <div style={{ ...card, borderColor: waterAlert ? '#f7c1c1' : 'rgba(0,0,0,0.08)' }}>
          <h2 style={sectionTitle}>
            <Droplets size={15} aria-hidden="true" />
            Nivel de agua
          </h2>
          {latest !== null ? (
            <NivelAgua level={latest.nivelAgua} />
          ) : (
            <div style={{ color: '#888780', fontSize: 14, paddingTop: 20 }}>Sin datos aún</div>
          )}
        </div>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '1rem',
        }}
      >
        <div style={card}>
          <h2 style={sectionTitle}>
            <Clock size={15} aria-hidden="true" />
            Promedio temperatura / hora
          </h2>
          {PromediosPorHora.length === 0 ? (
            <p style={{ color: '#888780', fontSize: 13, margin: 0 }}>Sin datos suficientes aún.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {PromediosPorHora.map((h) => {
                const pct = Math.min(100, Math.round((h.promedio / 50) * 100));
                const over = h.promedio > LimiteAlertaTemp;
                return (
                  <div key={h.hora} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 40, fontSize: 12, color: '#888780', flexShrink: 0 }}>{h.hora}</span>
                    <div
                      style={{
                        flex: 1,
                        height: 8,
                        borderRadius: 4,
                        background: '#e5e4de',
                        overflow: 'hidden',
                      }}
                      aria-hidden="true"
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: over ? '#e24b4a' : '#2a78d6',
                          borderRadius: 4,
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                    <span
                      style={{
                        width: 48,
                        fontSize: 12,
                        fontWeight: 500,
                        textAlign: 'right',
                        color: over ? '#a32d2d' : 'var(--text-primary, #0b0b0b)',
                        flexShrink: 0,
                      }}
                    >
                      {h.promedio}°C
                    </span>
                    <span style={{ width: 28, fontSize: 11, color: '#888780', flexShrink: 0 }}>
                      ×{h.cantidad}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={card}>
          <h2 style={sectionTitle}>
            Últimas {HistorialMax} lecturas
          </h2>
          {history.length === 0 ? (
            <p style={{ color: '#888780', fontSize: 13, margin: 0 }}>Sin lecturas aún.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}
                aria-label="Historial de lecturas del sensor"
              >
                <thead>
                  <tr>
                    {['Hora', 'Temp', 'Hum', 'Agua'].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: '4px 6px',
                          textAlign: 'left',
                          color: '#888780',
                          fontWeight: 500,
                          borderBottom: '0.5px solid rgba(0,0,0,0.08)',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((d, i) => {
                    const rowTempAlert = d.temperatura > LimiteAlertaTemp;
                    const rowWaterAlert = d.nivelAgua <= LimiteAlertaAgua;
                    return (
                      <tr
                        key={i}
                        style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)' }}
                      >
                        <td style={{ padding: '5px 6px', color: '#888780' }}>
                          {formatTime(d.timestamp)}
                        </td>
                        <td
                          style={{
                            padding: '5px 6px',
                            fontWeight: 500,
                            color: rowTempAlert ? '#a32d2d' : 'inherit',
                          }}
                        >
                          {d.temperatura.toFixed(1)}°
                        </td>
                        <td style={{ padding: '5px 6px' }}>{d.humedad.toFixed(1)}%</td>
                        <td
                          style={{
                            padding: '5px 6px',
                            fontWeight: rowWaterAlert ? 500 : 400,
                            color: rowWaterAlert ? '#854f0b' : 'inherit',
                          }}
                        >
                          {d.nivelAgua}/4
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Alertas */}
        <div style={card}>
          <h2 style={{ ...sectionTitle, justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={15} aria-hidden="true" />
              Alertas
            </span>
            {alerts.length === 0 && (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 12,
                  color: '#0f6e56',
                  fontWeight: 400,
                }}
              >
                <CheckCircle size={13} aria-hidden="true" />
                Todo normal
              </span>
            )}
          </h2>
          {alerts.length === 0 ? (
            <p style={{ color: '#888780', fontSize: 13, margin: 0 }}>
              No hay alertas activas.
            </p>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                maxHeight: 260,
                overflowY: 'auto',
              }}
              aria-live="polite"
              aria-label="Panel de alertas"
            >
              {alerts.map((a) => (
                <AlertRow key={a.id} alert={a} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
