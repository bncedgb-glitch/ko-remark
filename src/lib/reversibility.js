export function shouldAbortPatchedInstall({
  keypadPatched,
  hasHomeBackup,
  hasOptBackup,
}) {
  return Boolean(keypadPatched && !hasHomeBackup && !hasOptBackup);
}

export function isOriginalRestoreVerified(output) {
  return output.includes("VERIFY_ORIGINAL_OK");
}
