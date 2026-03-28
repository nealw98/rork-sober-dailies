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
    chatBubbleUser: "rgba(74, 144, 226, 0.5)", // Darker blue for better contrast
    chatBubbleBot: "rgba(92, 184, 92, 0.25)", // Green for Eddie (supportive sponsor)
    chatBubbleGrace: "rgba(186, 85, 211, 0.25)", // Darker lavender for Grace
    chatBubbleSalty: "rgba(255, 191, 0, 0.25)", // Darker amber for Salty Sam
    border: "#e9ecef",
    // Recognition colors for success messages and celebrations
    recognition: {
      gradientStart: "#667eea",
      gradientEnd: "#764ba2",
      text: "white",
    },
  },
  // Global gradient configurations for consistent app-wide styling
  gradients: {
    // Main page gradient (used on home screen and main feature pages)
    main: ['#B8D4F1', '#C4E0E5'],  // Opaque blue-to-teal (2-color version)
    // Alternative: Three-color gradient for special pages
    mainThreeColor: ['#B8D4F1', '#C4E0E5', '#D7EDE4'],  // Opaque blue → teal → green
  },
} as const;

export default Colors;