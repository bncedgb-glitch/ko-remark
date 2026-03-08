export function isKeyboardBluetoothInfo(output) {
  const text = output ?? "";
  return (
    text.includes("Icon: input-keyboard") ||
    text.includes("UUID: Human Interface Device")
  );
}

export function buildBluetoothKeyboardCleanupScript() {
  return `
KEYBOARD_ADDRS=$((
  bluetoothctl devices Paired 2>/dev/null || true
  bluetoothctl devices Trusted 2>/dev/null || true
  bluetoothctl devices Connected 2>/dev/null || true
) | awk '{print $2}' | sort -u)

TARGET_ADDRS=""
for ADDR in $KEYBOARD_ADDRS; do
  INFO=$(bluetoothctl info "$ADDR" 2>/dev/null || true)
  case "$INFO" in
    *"Icon: input-keyboard"*|*"UUID: Human Interface Device"*)
      TARGET_ADDRS="$TARGET_ADDRS $ADDR"
      ;;
  esac
done

TARGET_ADDRS=$(printf '%s\n' $TARGET_ADDRS | awk 'NF' | sort -u)
REMOVED_COUNT=0

for ADDR in $TARGET_ADDRS; do
  bluetoothctl disconnect "$ADDR" 2>/dev/null || true
  bluetoothctl untrust "$ADDR" 2>/dev/null || true
  bluetoothctl remove "$ADDR" 2>/dev/null || true
  for ADAPTER in /var/lib/bluetooth/*; do
    [ -d "$ADAPTER" ] || continue
    rm -rf "$ADAPTER/$ADDR" "$ADAPTER/cache/$ADDR" 2>/dev/null || true
  done
  REMOVED_COUNT=$((REMOVED_COUNT + 1))
done

systemctl restart bluetooth 2>/dev/null || true
echo "BT_KEYBOARD_REMOVED_COUNT=$REMOVED_COUNT"
`;
}
