export default function Success() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#1A3728",
      }}
    >
      <h1
        style={{
          color: "#FAF5E6",
          fontFamily: "serif",
          fontSize: "2rem",
          marginBottom: "1rem",
        }}
      >
        You&apos;re Pro.
      </h1>
      <p style={{ color: "#D2C8AF" }}>Reload MakerPeek in your browser to activate.</p>
    </main>
  );
}
