"use client";

/**
 * Signature element for the hero — a circuit trace that draws itself on
 * load, connecting labeled nodes. Visual echo of how the club's divisions
 * interconnect. One animated element per the design plan's "spend your
 * boldness in one place" principle — nothing else on the page animates.
 */
export function CircuitTrace() {
  const nodes = [
    { x: 40, y: 40, label: "SOFTWARE" },
    { x: 260, y: 20, label: "MECHANICAL" },
    { x: 460, y: 60, label: "ELECTRICAL" },
    { x: 380, y: 160, label: "AI / ML" },
    { x: 120, y: 150, label: "CONTROLS" },
  ];

  const path = "M40,40 L260,20 L460,60 L380,160 L120,150 L40,40";

  return (
    <svg
      viewBox="0 0 520 200"
      width="100%"
      height="auto"
      style={{ maxWidth: 520 }}
      role="img"
      aria-label="Diagram of interconnected engineering divisions"
    >
      <path
        d={path}
        fill="none"
        stroke="var(--secondary)"
        strokeWidth={1.5}
        strokeDasharray="900"
        strokeDashoffset="900"
        style={{ animation: "draw 2.2s ease-out forwards" }}
      />
      {nodes.map((node, i) => (
        <g key={node.label} style={{ animation: `fadeIn 0.4s ease-out ${1.6 + i * 0.15}s both` }}>
          <circle cx={node.x} cy={node.y} r={5} fill="var(--accent)" />
          <text
            x={node.x}
            y={node.y - 12}
            textAnchor="middle"
            fontFamily="var(--font-mono)"
            fontSize={10}
            fill="var(--text-secondary)"
            letterSpacing="0.05em"
          >
            {node.label}
          </text>
        </g>
      ))}
      <style>{`
        @keyframes draw { to { stroke-dashoffset: 0; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          path, g { animation: none !important; opacity: 1 !important; stroke-dashoffset: 0 !important; }
        }
      `}</style>
    </svg>
  );
}
