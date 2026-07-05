import { useTheme } from '@/hooks/useTheme';
import { getTokens, type Tokens } from '@/constants/designTokens';

/**
 * The one hook a screen needs for theming: semantic neutrals (`c`), the flat
 * `colors` set, and per-family `tone()`, all resolved against the live
 * Light / Dark / System appearance setting.
 *
 * Replaces the module-level `const c = getSemanticColors('light')` pattern —
 * styles that depend on color move into a `useMemo`'d factory or inline
 * overrides so they react to mode changes.
 */
export function useTokens(): Tokens {
  const { effectiveScheme } = useTheme();
  return getTokens(effectiveScheme);
}

/**
 * Mode-aware replacement for a module-level `StyleSheet.create`: pass a factory
 * that builds the styles from tokens. Results are cached per factory per mode,
 * so styles are still created exactly once per appearance (not per render).
 *
 *   const styles = useThemedStyles(makeStyles);
 *   ...
 *   const makeStyles = (tk: Tokens) => StyleSheet.create({ ... });
 */
const styleCache = new WeakMap<(tk: Tokens) => unknown, Partial<Record<Tokens['mode'], unknown>>>();

export function useThemedStyles<T>(factory: (tk: Tokens) => T): T {
  const tokens = useTokens();
  let byMode = styleCache.get(factory);
  if (!byMode) {
    byMode = {};
    styleCache.set(factory, byMode);
  }
  if (!byMode[tokens.mode]) byMode[tokens.mode] = factory(tokens);
  return byMode[tokens.mode] as T;
}
