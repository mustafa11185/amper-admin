/**
 * AmperLogo — React Component
 * نظام أمبير لإدارة المولدات الكهربائية
 *
 * Usage:
 *   <AmperLogo />                        → full dark logo (default)
 *   <AmperLogo variant="light" />        → blue on white
 *   <AmperLogo variant="gold" />         → gold accent
 *   <AmperLogo variant="icon" />         → icon only (48px)
 *   <AmperLogo variant="arabic" />       → Arabic version
 *   <AmperLogo size="sm|md|lg|xl" />     → scale presets
 *   <AmperLogo showTagline={false} />    → hide tagline
 */

import React from 'react';

const SIZES = {
  sm:  { scale: 0.55, iconSize: 28 },
  md:  { scale: 0.75, iconSize: 36 },
  lg:  { scale: 1.00, iconSize: 48 },
  xl:  { scale: 1.30, iconSize: 60 },
};

const VARIANTS = {
  dark: {
    hexFill:    '#0E2A50',
    hexStroke:  '#1A56A0',
    innerRing:  '#1A3A6B',
    dot:        '#2563EB',
    bolt:       '#F59E0B',
    boltLight:  '#FCD34D',
    text:       '#FFFFFF',
    tagline:    '#1E4D8C',
    separator:  '#1A3A6B',
  },
  light: {
    hexFill:    '#1A56A0',
    hexStroke:  '#1A56A0',
    innerRing:  'rgba(26,86,160,0.2)',
    dot:        '#1A56A0',
    bolt:       '#FFFFFF',
    boltLight:  'rgba(255,255,255,0.4)',
    text:       '#1A56A0',
    tagline:    '#7A9CC0',
    separator:  'rgba(26,86,160,0.2)',
  },
  gold: {
    hexFill:    '#F59E0B',
    hexStroke:  '#FCD34D',
    innerRing:  'rgba(245,158,11,0.25)',
    dot:        '#FCD34D',
    bolt:       '#FFFFFF',
    boltLight:  'rgba(255,255,255,0.3)',
    text:       '#F59E0B',
    tagline:    '#7A5A1A',
    separator:  'rgba(245,158,11,0.25)',
  },
  teal: {
    hexFill:    '#07241E',
    hexStroke:  '#0D9E7A',
    innerRing:  '#0B4A3A',
    dot:        '#0D9E7A',
    bolt:       '#0D9E7A',
    boltLight:  '#34D399',
    text:       '#FFFFFF',
    tagline:    '#0D6E54',
    separator:  '#0B4A3A',
  },
};

/* ── Icon (hexagon + bolt) ── */
function AmperIcon({ size = 48, colors }) {
  const s = size / 48;
  const p = (pts) =>
    pts.map(([x, y]) => `${x * s},${y * s}`).join(' ');

  return (
    <svg
      width={size}
      height={size * (35 / 48)}
      viewBox={`0 0 48 ${35}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <polygon
        points={p([[24,3],[40,3],[48,19],[40,35],[24,35],[16,19]])}
        fill={colors.hexFill}
        stroke={colors.hexStroke}
        strokeWidth={1.5 / s}
      />
      <polygon
        points={p([[24,7],[38,7],[45,19],[38,31],[24,31],[17,19]])}
        fill="none"
        stroke={colors.innerRing}
        strokeWidth={0.5 / s}
      />
      <circle cx={24*s} cy={3*s}  r={2*s} fill={colors.dot} opacity={0.6}/>
      <circle cx={40*s} cy={3*s}  r={2*s} fill={colors.dot} opacity={0.6}/>
      <circle cx={48*s} cy={19*s} r={2*s} fill={colors.dot} opacity={0.6}/>
      <polygon
        points={p([[30,7],[21,19],[27,19],[18,33],[38,17],[30,17]])}
        fill={colors.bolt}
      />
      <polygon
        points={p([[30,7],[29,9],[32,17],[38,17]])}
        fill={colors.boltLight}
        opacity={0.45}
      />
    </svg>
  );
}

/* ── Full Logo ── */
function AmperLogoFull({ colors, width = 420, showTagline = true }) {
  return (
    <svg
      width={width}
      height={showTagline ? 76 : 58}
      viewBox={`0 0 420 ${showTagline ? 76 : 58}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="AMPER — Smart Generator Management"
    >
      <title>AMPER</title>
      <polygon points="36,6 60,6 72,28 60,50 36,50 24,28"
        fill={colors.hexFill} stroke={colors.hexStroke} strokeWidth="1.2"/>
      <polygon points="36,11 57,11 68,28 57,45 36,45 25,28"
        fill="none" stroke={colors.innerRing} strokeWidth="0.5"/>
      <circle cx="36" cy="6"  r="1.5" fill={colors.dot} opacity="0.7"/>
      <circle cx="60" cy="6"  r="1.5" fill={colors.dot} opacity="0.7"/>
      <circle cx="72" cy="28" r="1.5" fill={colors.dot} opacity="0.7"/>
      <polygon points="52,11 38,30 48,30 34,51 62,26 50,26"
        fill={colors.bolt}/>
      <polygon points="52,11 50,14 54,26 62,26"
        fill={colors.boltLight} opacity="0.45"/>
      <text x="92" y="40"
        fontFamily="'IBM Plex Mono', monospace"
        fontSize="36" fontWeight="700"
        fill={colors.text} letterSpacing="5">AMPER</text>
      {showTagline && (
        <>
          <line x1="92" y1="50" x2="408" y2="50"
            stroke={colors.separator} strokeWidth="0.5"/>
          <text x="94" y="63"
            fontFamily="'IBM Plex Mono', monospace"
            fontSize="9" fill={colors.tagline} letterSpacing="3.5">
            SMART GENERATOR MANAGEMENT
          </text>
        </>
      )}
    </svg>
  );
}

/* ── Arabic Logo ── */
function AmperLogoArabic({ colors, width = 260 }) {
  return (
    <svg
      width={width}
      height={58}
      viewBox="0 0 260 58"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="أمبير — إدارة ذكية للمولدات الكهربائية"
    >
      <title>أمبير</title>
      <polygon points="230,5 246,5 254,19 246,33 230,33 222,19"
        fill={colors.hexFill} stroke={colors.hexStroke} strokeWidth="1.2"/>
      <polygon points="242,8 234,19 239,19 232,31 249,17 242,17"
        fill={colors.bolt}/>
      <text x="212" y="25"
        fontFamily="'Tajawal', sans-serif"
        fontSize="28" fontWeight="900"
        fill={colors.text} textAnchor="end">أمبير</text>
      <line x1="10" y1="34" x2="212" y2="34"
        stroke={colors.separator} strokeWidth="0.5"/>
      <text x="212" y="47"
        fontFamily="'Tajawal', sans-serif"
        fontSize="10" fill={colors.tagline} textAnchor="end">
        إدارة ذكية للمولدات الكهربائية
      </text>
    </svg>
  );
}

/* ── Main Export ── */
export default function AmperLogo({
  variant     = 'dark',
  size        = 'lg',
  showTagline = true,
  width,
  className   = '',
  style       = {},
}) {
  const colors  = VARIANTS[variant] || VARIANTS.dark;
  const sizeObj = SIZES[size]       || SIZES.lg;
  const w       = width ?? Math.round(420 * sizeObj.scale);

  if (variant === 'icon') {
    return (
      <span className={className} style={style}>
        <AmperIcon size={sizeObj.iconSize} colors={colors} />
      </span>
    );
  }

  if (variant === 'arabic') {
    return (
      <span className={className} style={style}>
        <AmperLogoArabic
          colors={VARIANTS.dark}
          width={Math.round(260 * sizeObj.scale)}
        />
      </span>
    );
  }

  return (
    <span className={className} style={style}>
      <AmperLogoFull
        colors={colors}
        width={w}
        showTagline={showTagline}
      />
    </span>
  );
}

/* ── Named exports for convenience ── */
export { AmperIcon, AmperLogoFull, AmperLogoArabic, VARIANTS, SIZES };
