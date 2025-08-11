const tintColorLight = "#4A90E2";

const Colors = {
  light: {
    text: "#333333",
    background: "#fff",
    tint: tintColorLight,
    tabIconDefault: "#ccc",
    tabIconSelected: tintColorLight,
    cardBackground: "#f8f9fa",
    accent: "#5CB85C",
    muted: "#6c757d",
    divider: "#e9ecef",
    chatBubbleUser: "rgba(74, 144, 226, 0.3)", // Exact light blue from daily reflection gradient
    chatBubbleBot: "rgba(92, 184, 92, 0.1)", // Exact light green from daily reflection gradient
    chatBubbleGrace: "rgba(186, 85, 211, 0.1)", // Light lavender for Grace
    chatBubbleSalty: "rgba(255, 191, 0, 0.1)", // Light amber for Salty Sam
    border: "#e9ecef",
  },
} as const;

export default Colors;