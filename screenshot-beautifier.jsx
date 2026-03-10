import { useState, useRef, useCallback, useEffect } from "react";

const PRESET_BACKGROUNDS = [
  { name: "Sunset", value: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" },
  { name: "Ocean", value: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" },
  { name: "Forest", value: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" },
  { name: "Night", value: "linear-gradient(135deg, #0c0c1d 0%, #1a1a3e 50%, #2d2d6b 100%)" },
  { name: "Purple Haze", value: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)" },
  { name: "Warm", value: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)" },
  { name: "Neon", value: "linear-gradient(135deg, #ff0099 0%, #493240 50%, #00d4ff 100%)" },
  { name: "Minimal Light", value: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)" },
  { name: "Slate", value: "linear-gradient(135deg, #334155 0%, #1e293b 100%)" },
  { name: "Candy", value: "linear-gradient(135deg, #ff6a88 0%, #ff99ac 50%, #fcb69f 100%)" },
  { name: "Aurora", value: "linear-gradient(135deg, #00c6fb 0%, #005bea 50%, #a855f7 100%)" },
  { name: "Ember", value: "linear-gradient(135deg, #f97316 0%, #ef4444 50%, #dc2626 100%)" },
];

function extractDominantColor(img) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  ctx.drawImage(img, 0, 0);

  const corners = [
    ctx.getImageData(2, 2, 1, 1).data,
    ctx.getImageData(img.naturalWidth - 3, 2, 1, 1).data,
    ctx.getImageData(2, img.naturalHeight - 3, 1, 1).data,
    ctx.getImageData(img.naturalWidth - 3, img.naturalHeight - 3, 1, 1).data,
  ];

  let r = 0, g = 0, b = 0;
  corners.forEach((c) => { r += c[0]; g += c[1]; b += c[2]; });
  r = Math.round(r / 4);
  g = Math.round(g / 4);
  b = Math.round(b / 4);
  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : null;
}

const POSITION_MAP = {
  "top-left":     { justify: "flex-start", align: "flex-start" },
  "top":          { justify: "center",     align: "flex-start" },
  "top-right":    { justify: "flex-end",   align: "flex-start" },
  "left":         { justify: "flex-start", align: "center" },
  "center":       { justify: "center",     align: "center" },
  "right":        { justify: "flex-end",   align: "center" },
  "bottom-left":  { justify: "flex-start", align: "flex-end" },
  "bottom":       { justify: "center",     align: "flex-end" },
  "bottom-right": { justify: "flex-end",   align: "flex-end" },
};

function getExportOffset(position, paddingW, paddingH) {
  const pos = POSITION_MAP[position] || POSITION_MAP["center"];
  let x = paddingW; // center
  let y = paddingH;
  if (pos.justify === "flex-start") x = 0;
  if (pos.justify === "flex-end") x = paddingW * 2;
  if (pos.align === "flex-start") y = 0;
  if (pos.align === "flex-end") y = paddingH * 2;
  return { x, y };
}

function isLightColor(color) {
  const m = color.match(/\d+/g);
  if (!m) return true;
  const [r, g, b] = m.map(Number);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

export default function ScreenshotBeautifier() {
  const [image, setImage] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [bgColor, setBgColor] = useState(null);
  const [selectedBg, setSelectedBg] = useState(PRESET_BACKGROUNDS[0].value);
  const [customBg, setCustomBg] = useState("");
  const [padding, setPadding] = useState(64);
  const [borderRadius, setBorderRadius] = useState(16);
  const [borderWidth, setBorderWidth] = useState(0);
  const [borderColor, setBorderColor] = useState("#ffffff");
  const [shadow, setShadow] = useState(true);
  const [bgMode, setBgMode] = useState("preset");
  const [position, setPosition] = useState("center");
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [exporting, setExporting] = useState(false);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const dropRef = useRef(null);

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrc(e.target.result);
    };
    reader.readAsDataURL(file);
  }, []);

  const onImageLoad = useCallback((e) => {
    const img = e.target;
    setImage(img);
    const color = extractDominantColor(img);
    setBgColor(color);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        handleFile(item.getAsFile());
        return;
      }
    }
  }, [handleFile]);

  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  const getBackground = () => {
    if (bgMode === "auto" && bgColor) return bgColor;
    if (bgMode === "custom" && customBg) return customBg;
    return selectedBg;
  };

  const exportImage = useCallback(async () => {
    if (!image) return;
    setExporting(true);
    try {
      const scale = 2;
      const totalW = (image.naturalWidth + padding * 2 + borderWidth * 2) * scale;
      const totalH = (image.naturalHeight + padding * 2 + borderWidth * 2) * scale;
      const canvas = document.createElement("canvas");
      canvas.width = totalW;
      canvas.height = totalH;
      const ctx = canvas.getContext("2d");

      const bg = getBackground();
      if (bg.includes("gradient")) {
        const tempDiv = document.createElement("div");
        tempDiv.style.width = totalW + "px";
        tempDiv.style.height = totalH + "px";
        tempDiv.style.background = bg;
        document.body.appendChild(tempDiv);
        const cs = getComputedStyle(tempDiv);
        document.body.removeChild(tempDiv);

        const grad = ctx.createLinearGradient(0, 0, totalW, totalH);
        const colors = bg.match(/#[a-f\d]{6}|rgb[a]?\([^)]+\)/gi) || ["#000", "#fff"];
        colors.forEach((c, i) => grad.addColorStop(i / (colors.length - 1), c));
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = bg;
      }
      ctx.fillRect(0, 0, totalW, totalH);

      const posOffset = getExportOffset(position, padding, padding);
      const imgX = (posOffset.x + borderWidth + offsetX) * scale;
      const imgY = (posOffset.y + borderWidth + offsetY) * scale;
      const imgW = image.naturalWidth * scale;
      const imgH = image.naturalHeight * scale;
      const br = borderRadius * scale;

      if (borderWidth > 0) {
        const bw = borderWidth * scale;
        ctx.beginPath();
        const bx = imgX - bw;
        const by = imgY - bw;
        const bWidth = imgW + bw * 2;
        const bHeight = imgH + bw * 2;
        const bbr = br + bw;
        ctx.roundRect(bx, by, bWidth, bHeight, bbr);
        ctx.fillStyle = borderColor;
        ctx.fill();
      }

      if (shadow) {
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.25)";
        ctx.shadowBlur = 40 * scale;
        ctx.shadowOffsetY = 10 * scale;
        ctx.beginPath();
        ctx.roundRect(imgX, imgY, imgW, imgH, br);
        ctx.fillStyle = "rgba(0,0,0,1)";
        ctx.fill();
        ctx.restore();
      }

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(imgX, imgY, imgW, imgH, br);
      ctx.clip();
      ctx.drawImage(image, imgX, imgY, imgW, imgH);
      ctx.restore();

      const link = document.createElement("a");
      link.download = "screenshot-styled.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setExporting(false);
    }
  }, [image, padding, borderRadius, borderWidth, borderColor, shadow, bgMode, bgColor, selectedBg, customBg, position, offsetX, offsetY]);

  const previewBg = getBackground();
  const light = bgColor ? isLightColor(bgColor) : true;

  const pos = POSITION_MAP[position] || POSITION_MAP["center"];
  const pLeft = pos.justify === "flex-start" ? 0 : pos.justify === "flex-end" ? padding * 2 : padding;
  const pRight = pos.justify === "flex-start" ? padding * 2 : pos.justify === "flex-end" ? 0 : padding;
  const pTop = pos.align === "flex-start" ? 0 : pos.align === "flex-end" ? padding * 2 : padding;
  const pBottom = pos.align === "flex-start" ? padding * 2 : pos.align === "flex-end" ? 0 : padding;

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f0f", color: "#e5e5e5", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#fff", margin: 0 }}>Screenshot Beautifier</h1>
          <p style={{ color: "#888", marginTop: 8, fontSize: 14 }}>Upload a screenshot, customize the style and download it</p>
        </div>

        {!imageSrc ? (
          <div
            ref={dropRef}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => { const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.onchange = (e) => handleFile(e.target.files[0]); inp.click(); }}
            style={{
              border: `2px dashed ${isDragging ? "#a78bfa" : "#444"}`,
              borderRadius: 16,
              padding: "80px 40px",
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.2s",
              background: isDragging ? "rgba(167,139,250,0.05)" : "rgba(255,255,255,0.02)",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>📸</div>
            <p style={{ fontSize: 18, color: "#ccc", margin: 0 }}>Drag an image, click, or paste with Ctrl+V</p>
            <p style={{ fontSize: 13, color: "#666", marginTop: 8 }}>PNG, JPG, WebP</p>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            {/* Preview */}
            <div style={{ flex: "1 1 600px", minWidth: 0 }}>
              <div
                style={{
                  background: previewBg,
                  borderRadius: 12,
                  padding: `${pTop}px ${pRight}px ${pBottom}px ${pLeft}px`,
                  overflow: "hidden",
                }}
              >
                <img
                  ref={imgRef}
                  src={imageSrc}
                  onLoad={onImageLoad}
                  style={{
                    maxWidth: "100%",
                    height: "auto",
                    borderRadius: borderRadius,
                    border: borderWidth > 0 ? `${borderWidth}px solid ${borderColor}` : "none",
                    boxShadow: shadow ? "0 10px 40px rgba(0,0,0,0.25)" : "none",
                    display: "block",
                    transform: `translate(${offsetX}px, ${offsetY}px)`,
                    flexShrink: 0,
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 16, justifyContent: "center", flexWrap: "wrap" }}>
                <button
                  onClick={exportImage}
                  disabled={exporting}
                  style={{
                    background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    padding: "12px 32px",
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: exporting ? "wait" : "pointer",
                    opacity: exporting ? 0.7 : 1,
                  }}
                >
                  {exporting ? "Exporting..." : "⬇ Download PNG"}
                </button>
                <button
                  onClick={() => { setImageSrc(null); setImage(null); setBgColor(null); }}
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    color: "#ccc",
                    border: "1px solid #333",
                    borderRadius: 10,
                    padding: "12px 24px",
                    fontSize: 15,
                    cursor: "pointer",
                  }}
                >
                  Change image
                </button>
              </div>
            </div>

            {/* Controls */}
            <div style={{ flex: "0 0 280px", display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Background mode */}
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#aaa", textTransform: "uppercase", letterSpacing: 1 }}>Background</label>
                <div style={{ display: "flex", gap: 4, marginTop: 10, marginBottom: 12 }}>
                  {[
                    { key: "preset", label: "Presets" },
                    { key: "auto", label: "Auto" },
                    { key: "custom", label: "Custom" },
                  ].map((m) => (
                    <button
                      key={m.key}
                      onClick={() => setBgMode(m.key)}
                      style={{
                        flex: 1,
                        padding: "6px 8px",
                        fontSize: 12,
                        fontWeight: 600,
                        borderRadius: 8,
                        border: "none",
                        cursor: "pointer",
                        background: bgMode === m.key ? "#8b5cf6" : "rgba(255,255,255,0.06)",
                        color: bgMode === m.key ? "#fff" : "#999",
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {bgMode === "preset" && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                    {PRESET_BACKGROUNDS.map((bg) => (
                      <button
                        key={bg.name}
                        title={bg.name}
                        onClick={() => setSelectedBg(bg.value)}
                        style={{
                          width: "100%",
                          aspectRatio: "1",
                          borderRadius: 8,
                          border: selectedBg === bg.value ? "2px solid #8b5cf6" : "2px solid transparent",
                          background: bg.value,
                          cursor: "pointer",
                          padding: 0,
                        }}
                      />
                    ))}
                  </div>
                )}

                {bgMode === "auto" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: bgColor || "#666", border: "1px solid #444" }} />
                    <span style={{ fontSize: 13, color: "#aaa" }}>Detected color from screenshot</span>
                  </div>
                )}

                {bgMode === "custom" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <input
                      type="text"
                      placeholder="CSS: #hex, rgb(), gradient..."
                      value={customBg}
                      onChange={(e) => setCustomBg(e.target.value)}
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid #444",
                        borderRadius: 8,
                        padding: "8px 12px",
                        color: "#eee",
                        fontSize: 13,
                        outline: "none",
                      }}
                    />
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        type="color"
                        value="#8b5cf6"
                        onChange={(e) => setCustomBg(e.target.value)}
                        style={{ width: 36, height: 36, border: "none", borderRadius: 8, cursor: "pointer", background: "transparent" }}
                      />
                      <span style={{ fontSize: 12, color: "#666", alignSelf: "center" }}>or pick a color</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Spacing & shape */}
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#aaa", textTransform: "uppercase", letterSpacing: 1 }}>Shape</label>

                <div style={{ marginTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: "#bbb" }}>Padding</span>
                    <span style={{ fontSize: 13, color: "#888" }}>{padding}px</span>
                  </div>
                  <input type="range" min={0} max={160} value={padding} onChange={(e) => setPadding(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "#8b5cf6" }} />
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: "#bbb" }}>Border Radius</span>
                    <span style={{ fontSize: 13, color: "#888" }}>{borderRadius}px</span>
                  </div>
                  <input type="range" min={0} max={48} value={borderRadius} onChange={(e) => setBorderRadius(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "#8b5cf6" }} />
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: "#bbb" }}>Border</span>
                    <span style={{ fontSize: 13, color: "#888" }}>{borderWidth}px</span>
                  </div>
                  <input type="range" min={0} max={8} value={borderWidth} onChange={(e) => setBorderWidth(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "#8b5cf6" }} />
                </div>

                {borderWidth > 0 && (
                  <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="color" value={borderColor} onChange={(e) => setBorderColor(e.target.value)}
                      style={{ width: 28, height: 28, border: "none", borderRadius: 6, cursor: "pointer", background: "transparent" }} />
                    <span style={{ fontSize: 12, color: "#888" }}>Border color</span>
                  </div>
                )}
              </div>

              {/* Shadow */}
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 16 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <input type="checkbox" checked={shadow} onChange={(e) => setShadow(e.target.checked)}
                    style={{ accentColor: "#8b5cf6", width: 16, height: 16 }} />
                  <span style={{ fontSize: 14, color: "#ccc" }}>Shadow</span>
                </label>
              </div>

              {/* Position */}
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#aaa", textTransform: "uppercase", letterSpacing: 1 }}>Position</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, marginTop: 10, width: 96, margin: "10px auto 0" }}>
                  {["top-left", "top", "top-right", "left", "center", "right", "bottom-left", "bottom", "bottom-right"].map((pos) => (
                    <button
                      key={pos}
                      onClick={() => setPosition(pos)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        border: "none",
                        cursor: "pointer",
                        background: position === pos ? "#8b5cf6" : "rgba(255,255,255,0.08)",
                        transition: "background 0.15s",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <div style={{
                        width: position === pos ? 8 : 6,
                        height: position === pos ? 8 : 6,
                        borderRadius: "50%",
                        background: position === pos ? "#fff" : "#666",
                      }} />
                    </button>
                  ))}
                </div>

                <div style={{ marginTop: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: "#bbb" }}>Offset X</span>
                    <span style={{ fontSize: 13, color: "#888" }}>{offsetX}px</span>
                  </div>
                  <input type="range" min={-200} max={200} value={offsetX} onChange={(e) => setOffsetX(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "#8b5cf6" }} />
                </div>

                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: "#bbb" }}>Offset Y</span>
                    <span style={{ fontSize: 13, color: "#888" }}>{offsetY}px</span>
                  </div>
                  <input type="range" min={-200} max={200} value={offsetY} onChange={(e) => setOffsetY(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "#8b5cf6" }} />
                </div>

                {(offsetX !== 0 || offsetY !== 0 || position !== "center") && (
                  <button
                    onClick={() => { setPosition("center"); setOffsetX(0); setOffsetY(0); }}
                    style={{
                      marginTop: 10,
                      width: "100%",
                      padding: "6px",
                      fontSize: 12,
                      color: "#999",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid #333",
                      borderRadius: 8,
                      cursor: "pointer",
                    }}
                  >
                    Reset position
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}