interface Props { score: number; type: 'sakura' | 'resale'; }

export default function ScoreGauge({ score }: Props) {
  const getColor = (s: number) => {
    if (s >= 80) return '#ef4444';
    if (s >= 60) return '#f97316';
    if (s >= 40) return '#eab308';
    return '#22c55e';
  };
  
  const color = getColor(score);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  return (
    <div className="score-gauge">
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} transform="rotate(-90 50 50)" />
        <text x="50" y="50" textAnchor="middle" dy="0.3em" fill={color} style={{fontSize: 18, fontWeight: 700}}>{score}%</text>
      </svg>
    </div>
  );
}
