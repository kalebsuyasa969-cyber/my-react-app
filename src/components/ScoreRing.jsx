export default function ScoreRing({ percentage, size = 160 }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle className="score-ring-bg" cx={size / 2} cy={size / 2} r={radius} />
        <circle
          className="score-ring-progress"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="score-ring-label">
        <strong>{percentage}%</strong>
        <span>Nilai</span>
      </div>
    </div>
  );
}
