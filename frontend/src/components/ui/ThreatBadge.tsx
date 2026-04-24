interface ThreatBadgeProps {
  fraud: boolean;
  confidence?: number;
}

export function ThreatBadge({ fraud, confidence }: ThreatBadgeProps) {
  const level =
    confidence && confidence > 85
      ? "CRITICAL"
      : confidence && confidence > 60
      ? "HIGH"
      : confidence && confidence > 40
      ? "MODERATE"
      : "LOW";

  return (
    <div
      className={`px-5 py-2 text-xs font-bold tracking-widest rounded-full inline-block ${
        fraud
          ? "bg-red-600 text-white animate-alert-pulse"
          : "bg-green-600 text-white"
      }`}
    >
      {fraud ? `THREAT LEVEL: ${level}` : "SECURE"}
    </div>
  );
}
