import React from 'react';
import Svg, { Circle, Path, Polygon, Polyline, Rect } from 'react-native-svg';

export type PrototypeIconName =
  | 'book'
  | 'check'
  | 'checkPlain'
  | 'heart'
  | 'home'
  | 'journal'
  | 'library'
  | 'lotus'
  | 'moon'
  | 'pen'
  | 'phone'
  | 'play'
  | 'pray'
  | 'settings'
  | 'sliders'
  | 'sunrise'
  | 'user'
  | 'users';

interface PrototypeIconProps {
  name: PrototypeIconName | string;
  size?: number;
  color?: string;
  stroke?: number;
}

const PRAY_PATH = 'm235.32 180l-36.24-36.25l-36.46-120.29A21.76 21.76 0 0 0 128 12.93a21.76 21.76 0 0 0-34.62 10.53l-36.46 120.3L20.68 180a16 16 0 0 0 0 22.62l32.69 32.69a16 16 0 0 0 22.63 0L124.28 187a40.68 40.68 0 0 0 3.72-4.29a40.68 40.68 0 0 0 3.72 4.29L180 235.32a16 16 0 0 0 22.63 0l32.69-32.69a16 16 0 0 0 0-22.63ZM64.68 224L32 191.32l12.69-12.69l32.69 32.69ZM120 158.75a23.85 23.85 0 0 1-7 17L88.68 200L56 167.32l13.65-13.66a8 8 0 0 0 2-3.34l37-122.22A5.78 5.78 0 0 1 120 29.78Zm23 17a23.85 23.85 0 0 1-7-17v-129a5.78 5.78 0 0 1 11.31-1.68l37 122.22a8 8 0 0 0 2 3.34l14.49 14.49l-33.4 32ZM191.32 224l-12.56-12.57l33.39-32L224 191.32Z';

export function PrototypeIcon({
  name,
  size = 22,
  color = 'currentColor',
  stroke = 1.75,
}: PrototypeIconProps) {
  if (name === 'pray') {
    return (
      <Svg viewBox="0 0 256 256" width={size} height={size}>
        <Path fill={color} d={PRAY_PATH} />
      </Svg>
    );
  }

  const common = {
    stroke: color,
    strokeWidth: stroke,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      {name === 'sunrise' ? (
        <>
          <Path {...common} d="M12 2.6v2.5" />
          <Path {...common} d="M5.9 6 7.7 7.8" />
          <Path {...common} d="M18.1 6 16.3 7.8" />
          <Path {...common} d="M7.4 14.5a4.6 4.6 0 0 1 9.2 0" />
          <Path {...common} d="M3.5 19q8.5-2.9 17 0" />
        </>
      ) : null}
      {name === 'moon' ? <Path {...common} d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /> : null}
      {name === 'heart' ? <Path {...common} d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /> : null}
      {name === 'pen' ? (
        <>
          <Path {...common} d="M12 20h9" />
          <Path {...common} d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </>
      ) : null}
      {name === 'journal' ? (
        <>
          <Path {...common} d="M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
          <Path {...common} d="M8 3v18" />
          <Path {...common} d="M11 8h5" />
          <Path {...common} d="M11 12h5" />
          <Path {...common} d="M11 16h3" />
        </>
      ) : null}
      {name === 'book' ? (
        <>
          <Path {...common} d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <Path {...common} d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </>
      ) : null}
      {name === 'library' ? (
        <>
          <Path {...common} d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <Path {...common} d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </>
      ) : null}
      {name === 'users' ? (
        <>
          <Path {...common} d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <Circle {...common} cx="9" cy="7" r="4" />
          <Path {...common} d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <Path {...common} d="M16 3.13a4 4 0 0 1 0 7.75" />
        </>
      ) : null}
      {name === 'user' ? (
        <>
          <Circle {...common} cx="12" cy="8" r="4" />
          <Path {...common} d="M5.5 20.5a7 7 0 0 1 13 0" />
        </>
      ) : null}
      {name === 'home' ? (
        <>
          <Path {...common} d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <Polyline {...common} points="9 22 9 12 15 12 15 22" />
        </>
      ) : null}
      {name === 'phone' ? <Path {...common} d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /> : null}
      {name === 'sliders' ? (
        <>
          <Path {...common} d="M21 6H10" />
          <Path {...common} d="M6 6H3" />
          <Path {...common} d="M21 12h-7" />
          <Path {...common} d="M10 12H3" />
          <Path {...common} d="M21 18H9" />
          <Path {...common} d="M5 18H3" />
          <Circle {...common} cx="8" cy="6" r="2" />
          <Circle {...common} cx="12" cy="12" r="2" />
          <Circle {...common} cx="7" cy="18" r="2" />
        </>
      ) : null}
      {name === 'check' ? (
        <>
          <Circle {...common} cx="12" cy="12" r="10" />
          <Path {...common} d="m9 12 2 2 4-4" />
        </>
      ) : null}
      {name === 'checkPlain' ? <Path {...common} d="M20 6 9 17l-5-5" /> : null}
      {name === 'play' ? <Polygon points="8 5 19 12 8 19 8 5" fill={color} /> : null}
      {name === 'lotus' ? (
        <>
          <Path {...common} d="M12 19c-2.2-2.1-3.2-4.1-3.2-6 0-2.6 1.8-4.8 3.2-6.2 1.4 1.4 3.2 3.6 3.2 6.2 0 1.9-1 3.9-3.2 6z" />
          <Path {...common} d="M12 19c-3.4-.2-6-1.2-7.4-3.2-1.2-1.7-1.1-3.9-.6-5.7 1.9.3 4.2 1.1 5.7 2.8" />
          <Path {...common} d="M12 19c3.4-.2 6-1.2 7.4-3.2 1.2-1.7 1.1-3.9.6-5.7-1.9.3-4.2 1.1-5.7 2.8" />
          <Path {...common} d="M5 19h14" />
        </>
      ) : null}
      {name === 'settings' ? (
        <>
          <Circle {...common} cx="12" cy="12" r="3" />
          <Path {...common} d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </>
      ) : null}
      {name === 'circle' ? <Circle {...common} cx="12" cy="12" r="10" /> : null}
      {name === 'fallback' || !name ? <Rect {...common} x="5" y="5" width="14" height="14" rx="3" /> : null}
    </Svg>
  );
}
