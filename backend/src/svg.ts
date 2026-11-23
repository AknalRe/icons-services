export interface SanitizedSvg {
  svg: string;
  viewBox: string;
}

export function sanitizeSvg(raw: string): SanitizedSvg | null {
  const trimmed = raw.trim();
  const startIdx = trimmed.indexOf("<svg");
  const endIdx = trimmed.lastIndexOf("</svg>");
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    return null;
  }

  let svg = trimmed.slice(startIdx, endIdx + 6);

  // Strip dangerous tags and event handlers
  svg = svg.replace(/<script[\s\S]*?<\/script>/gi, "");
  svg = svg.replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "");
  svg = svg.replace(/<iframe[\s\S]*?<\/iframe>/gi, "");
  svg = svg.replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  svg = svg.replace(/(?:href|xlink:href)\s*=\s*(?:"\s*javascript:[^"]*"|'\s*javascript:[^']*')/gi, "");

  if (!svg.startsWith("<svg") || !svg.endsWith("</svg>")) {
    return null;
  }

  // Ensure xmlns attribute exists
  if (!/xmlns\s*=\s*["']http:\/\/www\.w3\.org\/2000\/svg["']/i.test(svg)) {
    svg = svg.replace(/^<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  const vbMatch = /viewBox\s*=\s*["']([^"']+)["']/i.exec(svg);
  const viewBox = vbMatch ? vbMatch[1].trim() : "0 0 24 24";

  return { svg, viewBox };
}

export function applySvgParams(svg: string, options: { color?: string; size?: number }): string {
  let out = svg;
  if (options.color && /^#?[0-9a-fA-F]{3,8}$/.test(options.color)) {
    const hex = options.color.startsWith("#") ? options.color : `#${options.color}`;
    out = out.replace(/currentColor/g, hex);
  }
  if (options.size && Number.isFinite(options.size) && options.size >= 12 && options.size <= 512) {
    const px = Math.round(options.size);
    if (/\bwidth\s*=/i.test(out.slice(0, out.indexOf(">")))) {
      out = out.replace(/(<svg\b[^>]*?)\bwidth\s*=\s*["'][^"']*["']/i, `$1width="${px}"`);
    } else {
      out = out.replace(/^<svg\b/i, `<svg width="${px}"`);
    }
    if (/\bheight\s*=/i.test(out.slice(0, out.indexOf(">")))) {
      out = out.replace(/(<svg\b[^>]*?)\bheight\s*=\s*["'][^"']*["']/i, `$1height="${px}"`);
    } else {
      out = out.replace(/^<svg\b/i, `<svg height="${px}"`);
    }
  }
  return out;
}
