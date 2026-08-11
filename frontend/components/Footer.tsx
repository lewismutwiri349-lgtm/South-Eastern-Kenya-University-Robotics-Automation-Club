export function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--border)",
        marginTop: "var(--space-16)",
        padding: "var(--space-8) var(--space-6)",
        color: "var(--text-muted)",
        fontSize: 13,
        fontFamily: "var(--font-mono)",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "var(--space-4)",
        }}
      >
        <span>ROBOTICS &amp; AUTONOMOUS SYSTEMS CLUB</span>
        <span>BUILT BY MEMBERS, FOR MEMBERS</span>
      </div>
    </footer>
  );
}
