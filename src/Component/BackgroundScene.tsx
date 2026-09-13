const progressLabels = ["PLAN", "BUILD", "SHIP", "GROW"];

export default function BackgroundScene() {
  return (
    <div className="background-scene" aria-hidden="true">
      <div className="background-grid" />
      <div className="background-glass background-glass-one" />
      <div className="background-glass background-glass-two" />

      <div className="code-vortex">
        {progressLabels.map((label, index) => (
          <span key={label} className={`code-line code-line-${index + 1}`}>{label}</span>
        ))}
      </div>

      <div className="particle-layer">
        {[...Array(22)].map((_, index) => (
          <span key={index} className={`particle particle-${index + 1}`} />
        ))}
      </div>
    </div>
  );
}
