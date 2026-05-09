import { ImageResponse } from "next/og";

/**
 * App icon — Next.js auto-routes /app/icon.tsx to /icon (and uses it as the
 * favicon).  Plain typographic mark on the brand forest-green: "F1" in
 * white, slightly geometric.  Matches the poster's identity instead of the
 * usual emoji-or-stock icon AI default.
 */
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1d5a3a",
          color: "#fafaf8",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          fontSize: 36,
          fontWeight: 700,
          letterSpacing: "-0.04em",
          borderRadius: 12,
        }}
      >
        F1
      </div>
    ),
    { ...size }
  );
}
