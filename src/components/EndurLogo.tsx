/**
 * EndurLogo — ENDURTECH brand v1.0 (2025)
 *
 * Wordmark: "ENDUR" (light) + "TECH" (cyan accent), single concatenated word.
 * Mark: hexagon outline containing "E•" — letter E with bullet dot.
 * Tagline (full variant): "SOLUTIONS · IRAQ · EST. 2025"
 *
 * Brand history: registered company "شركة اندر للحلول التقنية" — ENDURTECH
 * is the marketing wordmark used in product UI; legal name appears on
 * invoices/contracts.
 */

import React from "react";

type Variant = "dark" | "light" | "white" | "icon";
type Size = "sm" | "md" | "lg" | "xl";

const SIZES: Record<Size, { scale: number; iconSize: number }> = {
  sm: { scale: 0.55, iconSize: 32 },
  md: { scale: 0.75, iconSize: 40 },
  lg: { scale: 1.0, iconSize: 52 },
  xl: { scale: 1.3, iconSize: 64 },
};

interface PaletteColors {
  endur: string;       // "ENDUR" wordmark color
  tech: string;        // "TECH" wordmark color
  hexStroke: string;   // hexagon outline
  mark: string;        // E + dot inside the hex
  tagline: string;
  separator: string;
}

const VARIANTS: Record<Exclude<Variant, "icon">, PaletteColors> = {
  // For dark backgrounds (e.g. dark sidebar) — ENDUR white, TECH cyan
  dark: {
    endur: "#F0F4F8",
    tech: "#4DD8CC",
    hexStroke: "#4DD8CC",
    mark: "#4DD8CC",
    tagline: "#4DD8CC",
    separator: "rgba(77,216,204,0.25)",
  },
  // For light backgrounds — ENDUR navy, TECH teal
  light: {
    endur: "#0D1B2A",
    tech: "#00B4A6",
    hexStroke: "#00B4A6",
    mark: "#00B4A6",
    tagline: "#00B4A6",
    separator: "rgba(0,180,166,0.25)",
  },
  // Pure white (over photos / brand color blocks)
  white: {
    endur: "#FFFFFF",
    tech: "#FFFFFF",
    hexStroke: "#FFFFFF",
    mark: "#FFFFFF",
    tagline: "#FFFFFF",
    separator: "rgba(255,255,255,0.3)",
  },
};

interface MarkProps {
  stroke: string;
  fill: string;
}

/** Hexagon containing letter E + bullet dot — the ENDURTECH mark. */
function HexMark({ stroke, fill }: MarkProps) {
  return (
    <>
      <polygon
        points="60,12 102,36 102,84 60,108 18,84 18,36"
        fill="none"
        stroke={stroke}
        strokeWidth="3.5"
        strokeLinejoin="miter"
      />
      {/* Letter E */}
      <text
        x="48"
        y="74"
        fontFamily="'Outfit','Inter',sans-serif"
        fontSize="44"
        fontWeight="900"
        fill={fill}
        textAnchor="middle"
      >
        E
      </text>
      {/* Bullet dot to the right of E */}
      <circle cx="74" cy="60" r="4" fill={fill} />
    </>
  );
}

interface IconProps {
  size?: number;
  variant?: Exclude<Variant, "icon">;
}

export function EndurIcon({ size = 48, variant = "dark" }: IconProps) {
  const c = VARIANTS[variant];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <HexMark stroke={c.hexStroke} fill={c.mark} />
    </svg>
  );
}

interface FullProps {
  variant?: Exclude<Variant, "icon">;
  width?: number;
  showTagline?: boolean;
  showMark?: boolean;
}

/**
 * Full ENDURTECH wordmark (with optional mark and tagline).
 * Layout: [ENDURTECH wordmark]  [hex E• mark]
 *         [SOLUTIONS · IRAQ · EST. 2025]
 */
function EndurLogoFull({
  variant = "dark",
  width = 460,
  showTagline = true,
  showMark = true,
}: FullProps) {
  const c = VARIANTS[variant];
  const height = showTagline ? 80 : 60;

  return (
    <svg
      width={width}
      height={(width * height) / 460}
      viewBox={`0 0 460 ${height}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="ENDURTECH — Solutions · Iraq · Est. 2025"
    >
      <title>ENDURTECH</title>

      {/* ENDUR (left, light) + TECH (cyan accent) */}
      <text
        x="0"
        y="42"
        fontFamily="'Outfit','Inter',sans-serif"
        fontSize="40"
        fontWeight="900"
        letterSpacing="-1"
      >
        <tspan fill={c.endur}>ENDUR</tspan>
        <tspan fill={c.tech}>TECH</tspan>
      </text>

      {/* Tagline below */}
      {showTagline && (
        <>
          <line
            x1="0"
            y1="54"
            x2={showMark ? width - 80 : width - 6}
            y2="54"
            stroke={c.separator}
            strokeWidth="0.8"
          />
          <text
            x="0"
            y="68"
            fontFamily="'Outfit','Inter',sans-serif"
            fontSize="9"
            fontWeight="500"
            fill={c.tagline}
            letterSpacing="3"
          >
            SOLUTIONS · IRAQ · EST. 2025
          </text>
        </>
      )}

      {/* Hex E• mark to the right (if enabled) */}
      {showMark && (
        <g transform={`translate(${width - 60}, ${(height - 56) / 2}) scale(0.467)`}>
          <HexMark stroke={c.hexStroke} fill={c.mark} />
        </g>
      )}
    </svg>
  );
}

interface EndurLogoProps {
  variant?: Variant;
  size?: Size;
  showTagline?: boolean;
  showMark?: boolean;
  width?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function EndurLogo({
  variant = "dark",
  size = "lg",
  showTagline = true,
  showMark = true,
  width,
  className = "",
  style = {},
}: EndurLogoProps) {
  const sizeObj = SIZES[size];

  if (variant === "icon") {
    return (
      <span className={className} style={style}>
        <EndurIcon size={sizeObj.iconSize} variant="dark" />
      </span>
    );
  }

  const w = width ?? Math.round(460 * sizeObj.scale);
  return (
    <span className={className} style={style}>
      <EndurLogoFull
        variant={variant}
        width={w}
        showTagline={showTagline}
        showMark={showMark}
      />
    </span>
  );
}

/** Legal company name (for invoice headers, contracts). */
export const COMPANY_NAME_AR = "شركة اندر للحلول التقنية";
export const COMPANY_NAME_EN = "Endur Tech Solutions";
export const BRAND_WORDMARK = "ENDURTECH";
export const BRAND_TAGLINE_EN = "Build to Last";
export const BRAND_TAGLINE_AR = "تحمّل · تطوّر · استمر";
