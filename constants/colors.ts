/**
 * Fallback color constants. Derived from the default theme so that
 * components still importing Colors get the same values as the default theme.
 * Prefer useTheme().palette in new code.
 */
import { getThemeById, DEFAULT_THEME_ID } from './themes';

const defaultLight = getThemeById(DEFAULT_THEME_ID).light;

const Colors = {
  light: defaultLight,
  gradients: {
    main: defaultLight.gradients.main,
    mainThreeColor: defaultLight.gradients.mainThreeColor,
  },
  primary: defaultLight.tint,
} as const;

export default Colors;
