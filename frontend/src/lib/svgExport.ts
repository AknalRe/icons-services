export function toReactJsx(slug: string, svg: string): string {
  const componentName =
    slug
      .split(/[^a-zA-Z0-9]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("") + "Icon";

  const jsxSvg = svg
    .replace(/\bclass=/g, "className=")
    .replace(/\bstroke-width=/g, "strokeWidth=")
    .replace(/\bstroke-linecap=/g, "strokeLinecap=")
    .replace(/\bstroke-linejoin=/g, "strokeLinejoin=")
    .replace(/\bfill-rule=/g, "fillRule=")
    .replace(/\bclip-rule=/g, "clipRule=")
    .replace(/\bstop-color=/g, "stopColor=")
    .replace(/\bstop-opacity=/g, "stopOpacity=")
    .replace(/\bxmlns:xlink=/g, "xmlnsXlink=")
    .replace(/\bxlink:href=/g, "xlinkHref=")
    .replace(/^<svg\b/, "<svg {...props}");

  return `import type { SVGProps } from "react";\n\nexport function ${componentName}(props: SVGProps<SVGSVGElement>) {\n  return (\n    ${jsxSvg}\n  );\n}\n`;
}

export function applyColorToSvg(svg: string, color: string): string {
  if (!color || color === "currentColor") return svg;
  return svg.replace(/currentColor/g, color);
}

export async function downloadPngFromSvg(slug: string, svg: string, sizePx: number, color?: string): Promise<void> {
  const coloredSvg = color ? applyColorToSvg(svg, color) : svg;
  const blob = new Blob([coloredSvg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Gagal merender SVG ke PNG."));
      image.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = sizePx;
    canvas.height = sizePx;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas tidak tersedia.");
    ctx.clearRect(0, 0, sizePx, sizePx);
    ctx.drawImage(img, 0, 0, sizePx, sizePx);

    const pngUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = pngUrl;
    link.download = `${slug}-${sizePx}px.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
