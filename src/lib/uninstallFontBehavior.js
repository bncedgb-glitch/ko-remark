export const HANGUL_FONT_PATH = "/usr/share/fonts/ttf/noto/NotoSansCJKkr-Regular.otf";

/**
 * @typedef {object} FontRemovalOptions
 * @property {boolean} [deleteFont]
 * @property {string} [prefix]
 * @property {boolean} [ignoreMissing]
 * @property {boolean} [refreshCache]
 */

/**
 * @param {FontRemovalOptions} [options]
 */
export function buildFontRemovalCommands({
  deleteFont,
  prefix = "",
  ignoreMissing = false,
  refreshCache = false,
} = {}) {
  if (!deleteFont) {
    return "# 폰트 유지";
  }

  const fontPath = `${prefix}${HANGUL_FONT_PATH}`;
  const suffix = ignoreMissing ? " 2>/dev/null || true" : "";
  const commands = [`rm -f ${fontPath}${suffix}`];

  if (refreshCache) {
    commands.push("fc-cache -f 2>/dev/null || true");
  }

  return commands.join("\n");
}
