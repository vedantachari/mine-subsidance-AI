"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, ChartSpline, Phone, Siren, X } from "lucide-react";
import type { NodeDetail } from "@/types/api";

const statusStyles = {
  NORMAL: "bg-emerald-100 text-emerald-700",
  WATCH: "bg-amber-100 text-amber-700",
  WARNING: "bg-orange-100 text-orange-700",
  CRITICAL: "bg-rose-100 text-rose-700",
  OFFLINE: "bg-slate-200 text-slate-700",
};

function DetailRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-[11px]">
      <span className="text-zinc-500">{label}</span>
      <span className="text-right font-medium text-zinc-900">{value}</span>
    </div>
  );
}

function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-zinc-100 px-5 py-4">
      <h3 className="font-mono text-[10px] font-semibold tracking-widest text-zinc-500">{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function SignalGraph({
  values,
  secondaryValues,
  colors,
  unit,
}: {
  values: number[];
  secondaryValues?: number[];
  colors: [string, string?];
  unit: string;
}) {
  const primary = values.length ? values : [0];
  const allValues = secondaryValues ? [...primary, ...secondaryValues] : primary;
  const minimum = Math.min(...allValues);
  const maximum = Math.max(...allValues);
  const range = maximum - minimum || 1;
  const width = 320;
  const height = 112;
  const pointsFor = (series: number[]) => series.map((value, index) => {
    const x = series.length === 1 ? width / 2 : (index / (series.length - 1)) * width;
    const y = height - ((value - minimum) / range) * (height - 12) - 6;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  return (
    <div className="graph-reveal mt-3 rounded-2xl border border-zinc-300 bg-gradient-to-br from-slate-50 via-white to-cyan-50 p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between font-mono text-[9px] text-zinc-500">
        <span>{primary.length} samples</span>
        <span>{minimum.toFixed(3)} to {maximum.toFixed(3)} {unit}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-28 w-full" role="img" aria-label={`${unit} signal graph`}>
        {[20, 56, 92].map((y) => <line key={y} x1="0" x2={width} y1={y} y2={y} stroke="#cbd5e1" strokeWidth="1" />)}
        <polyline points={pointsFor(primary)} fill="none" stroke={colors[0]} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
        {secondaryValues && <polyline points={pointsFor(secondaryValues)} fill="none" stroke={colors[1]} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />}
      </svg>
      {secondaryValues && <div className="mt-1 flex gap-3 font-mono text-[9px] text-zinc-600"><span className="text-teal-800">ROLL</span><span className="text-amber-800">PITCH</span></div>}
    </div>
  );
}

export function NodeDetailPanel({ nodeId, onClose }: { nodeId: string; onClose: () => void }) {
  const [node, setNode] = useState<NodeDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visibleGraph, setVisibleGraph] = useState<"vibration" | "tilt" | null>(null);
  const hasLoaded = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const loadDetails = () => {
      fetch(`/api/nodes/${encodeURIComponent(nodeId)}`)
        .then((response) => {
          if (!response.ok) throw new Error("Unable to load node details");
          return response.json() as Promise<NodeDetail>;
        })
        .then((detail) => {
          if (!cancelled) {
            setNode(detail);
            setError(null);
            hasLoaded.current = true;
          }
        })
        .catch((requestError: Error) => {
          if (!cancelled && !hasLoaded.current) setError(requestError.message);
        });
    };

    loadDetails();
    const interval = window.setInterval(loadDetails, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [nodeId]);

  return (
    <aside className="fixed right-4 top-4 z-[1001] flex max-h-[calc(100dvh-2rem)] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-[28px] border border-zinc-200 bg-white text-black shadow-2xl">
      <div className="flex items-start justify-between px-5 py-4">
        <div>
          <p className="font-mono text-[10px] tracking-widest text-zinc-400">SELECTED NODE</p>
          <h2 className="mt-1 font-mono text-lg font-semibold text-zinc-950">{nodeId}</h2>
          {node && (
            <div className="mt-2 flex items-center gap-2">
              <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusStyles[node.status]}`}>{node.status}</span>
              <span className="text-[10px] text-zinc-500">Last seen {new Date(node.last_seen).toLocaleTimeString()}</span>
            </div>
          )}
        </div>
        <button type="button" onClick={onClose} aria-label="Close node details" className="rounded-xl p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900">
          <X size={18} />
        </button>
      </div>

      <div className="overflow-y-auto">
        {!node && !error && <p className="px-5 py-8 text-center text-xs text-zinc-500">Loading node details...</p>}
        {error && <p className="px-5 py-8 text-center text-xs text-rose-600">{error}</p>}
        {node && (
          <>
            <PanelSection title="RISK STATUS">
              <div className="flex items-end justify-between">
                <div><p className="text-2xl font-semibold text-zinc-950">{node.risk_score}<span className="text-sm text-zinc-400"> / 100</span></p><p className="text-[10px] text-zinc-500">Risk score</p></div>
                <span className="text-xs font-semibold text-orange-600">
                  {node.status_detail.trend === "INCREASING" ? "↑" : node.status_detail.trend === "DECREASING" ? "↓" : "→"} {node.status_detail.trend}
                </span>
              </div>
            </PanelSection>

            <PanelSection title="VIBRATION">
              <DetailRow label="RMS" value={`${node.vibration.rms_g} g`} />
              <DetailRow label="Peak" value={`${node.vibration.peak_g} g`} />
              <DetailRow label="Dominant frequency" value={`${node.vibration.dominant_frequency_hz} Hz`} />
              <DetailRow label="Classification" value={node.vibration.classification.label} />
              <DetailRow label="Confidence" value={`${Math.round(node.vibration.classification.confidence * 100)}%`} />
              <DetailRow label="Anomaly score" value={node.vibration.anomaly_score} />
              <button type="button" onClick={() => setVisibleGraph(visibleGraph === "vibration" ? null : "vibration")} aria-expanded={visibleGraph === "vibration"} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 py-2 text-[10px] font-semibold text-zinc-700 hover:bg-zinc-50">
                <Activity size={13} /> {visibleGraph === "vibration" ? "Hide Vibration Graph" : "View Vibration Graph"}
              </button>
              {visibleGraph === "vibration" && <SignalGraph values={node.vibration.samples ?? [node.vibration.rms_g]} colors={["#0f766e"]} unit="g" />}
            </PanelSection>

            <PanelSection title="TILT">
              <DetailRow label="Roll" value={`${node.tilt.roll_deg}°`} />
              <DetailRow label="Pitch" value={`${node.tilt.pitch_deg}°`} />
              <DetailRow label="Roll change" value={`${node.tilt.roll_change_deg >= 0 ? "+" : ""}${node.tilt.roll_change_deg}°`} />
              <DetailRow label="Rate" value={`${node.tilt.tilt_rate_deg_per_hour >= 0 ? "+" : ""}${node.tilt.tilt_rate_deg_per_hour}°/hr`} />
              <button type="button" onClick={() => setVisibleGraph(visibleGraph === "tilt" ? null : "tilt")} aria-expanded={visibleGraph === "tilt"} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 py-2 text-[10px] font-semibold text-zinc-700 hover:bg-zinc-50">
                <ChartSpline size={13} /> {visibleGraph === "tilt" ? "Hide Tilt History" : "View Tilt History"}
              </button>
              {visibleGraph === "tilt" && <SignalGraph values={(node.tilt.samples ?? [{ roll_deg: node.tilt.roll_deg, pitch_deg: node.tilt.pitch_deg }]).map((sample) => sample.roll_deg)} secondaryValues={(node.tilt.samples ?? [{ roll_deg: node.tilt.roll_deg, pitch_deg: node.tilt.pitch_deg }]).map((sample) => sample.pitch_deg)} colors={["#0f766e", "#b45309"]} unit="°" />}
            </PanelSection>

            <PanelSection title="LOCATION">
              <DetailRow label="Latitude" value={node.latitude.toFixed(6)} />
              <DetailRow label="Longitude" value={node.longitude.toFixed(6)} />
              <DetailRow label="Altitude" value={`${node.location.altitude_m} m`} />
              <DetailRow label="GPS fix" value={node.location.gps_fix ? "Good" : "Lost"} />
              <DetailRow label="Satellites" value={node.location.satellites} />
            </PanelSection>

            <PanelSection title="NODE HEALTH">
              <DetailRow label="Battery" value={`${node.power.battery_percent}%`} />
              <DetailRow label="Solar" value={node.power.solar_status} />
              <DetailRow label="RSSI" value={`${node.network.rssi_dbm} dBm`} />
              <DetailRow label="SNR" value={`${node.network.snr_db} dB`} />
              <DetailRow label="Hops" value={node.network.hop_count} />
            </PanelSection>

            <PanelSection title="ALERTS">
              {node.alerts.length === 0 ? <p className="text-[11px] text-zinc-500">No active alerts.</p> : node.alerts.map((alert) => <div key={alert.alert_id} className="rounded-xl bg-rose-50 p-3"><p className="text-[11px] font-semibold text-rose-800">{alert.message}</p><p className="mt-1 text-[10px] text-rose-600">{alert.severity} · {alert.acknowledged ? "Acknowledged" : "Needs attention"}</p></div>)}
              {(node.status === "WARNING" || node.status === "CRITICAL") ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <a href="tel:108" className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 py-2 text-[10px] font-semibold text-white transition-colors hover:bg-rose-700">
                    <Phone size={12} /> Ambulance
                  </a>
                  <a href="tel:112" className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 py-2 text-[10px] font-semibold text-rose-700 transition-colors hover:bg-rose-100">
                    <Siren size={12} /> Emergency Services
                  </a>
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" className="rounded-xl bg-zinc-900 py-2 text-[10px] font-semibold text-white">Acknowledge</button><button type="button" className="rounded-xl border border-zinc-200 py-2 text-[10px] font-semibold text-zinc-700">View Details</button></div>
              )}
            </PanelSection>

            <PanelSection title="NEIGHBORING NODES">
              {node.neighbors.map((neighbor) => <DetailRow key={neighbor.node_id} label={neighbor.node_id} value={`${neighbor.status} · ${neighbor.distance_m} m`} />)}
            </PanelSection>

            <div className="border-t border-zinc-100 p-5"><button type="button" className="w-full rounded-xl bg-indigo-600 py-3 text-[11px] font-semibold text-white hover:bg-indigo-700">View Full Node</button></div>
          </>
        )}
      </div>
    </aside>
  );
}
