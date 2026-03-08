import { sanitizeBluetoothLine } from "./bluetoothPairing.js";

export function extractDiscoveredDevice(line) {
  const stripped = sanitizeBluetoothLine(line);
  const newMatch = stripped.match(/\[NEW\]\s+Device\s+([0-9A-F:]+)\s+(.+)$/i);
  if (newMatch) {
    return {
      address: newMatch[1],
      name: newMatch[2].trim(),
    };
  }

  return null;
}

export function extractObservedDeviceAddress(line) {
  const stripped = sanitizeBluetoothLine(line);
  const match = stripped.match(/\[(?:NEW|CHG)\]\s+Device\s+([0-9A-F:]+)\b/i);
  return match ? match[1] : null;
}
