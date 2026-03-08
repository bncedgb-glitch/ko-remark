export const XOCHITL_DROPIN_DIR = "/usr/lib/systemd/system/xochitl.service.d";
export const XOCHITL_HOOK_DROPIN = `${XOCHITL_DROPIN_DIR}/zz-hangul-hook.conf`;

function normalizeLocales(locales = []) {
  return [...new Set(locales.filter(Boolean))];
}

export function mergeInstallState(current, requested) {
  const installKeypad = current.installKeypad || requested.installKeypad;
  const installBt = current.installBt || requested.installBt;

  let locales = [];
  if (installKeypad) {
    if (requested.installKeypad && requested.locales?.length) {
      locales = normalizeLocales(requested.locales);
    } else if (current.installKeypad && current.locales?.length) {
      locales = normalizeLocales(current.locales);
    } else {
      locales = normalizeLocales(requested.locales);
    }
  }

  return {
    installKeypad,
    installBt,
    locales,
  };
}

export function renderInstallState(state) {
  const locales = normalizeLocales(state.locales).join(",");
  return `INSTALL_KEYPAD=${state.installKeypad ? "1" : "0"}\nINSTALL_BT=${state.installBt ? "1" : "0"}\nKEYBOARD_LOCALES=${locales}\n`;
}
