const codeLines = [
  "npm run build",
  "ship(project)",
  "track(progress)",
  "xp += 50",
  "generateRoadmap()",
  "deploy --ready",
];

export default function BackgroundScene() {
  return (
    <div className="background-scene" aria-hidden="true">
      <div className="background-grid" />
      <div className="background-glass background-glass-one" />
      <div className="background-glass background-glass-two" />

      <div className="code-vortex">
        {codeLines.map((line, index) => (
          <span key={line} className={`code-line code-line-${index + 1}`}>{line}</span>
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
