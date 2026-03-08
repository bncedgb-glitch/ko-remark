import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";

// @MX:NOTE: Diagnostic endpoint to investigate on-screen keyboard issues
// @MX:REASON: Reads device state (en_US layout format, xochitl logs, installed files) for debugging

function runSsh(
  ip: string,
  password: string,
  command: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, SSHPASS: password, PATH: `${process.env.PATH}:/opt/homebrew/bin:/usr/local/bin` };
    const proc = spawn(
      "sshpass",
      [
        "-e",
        "ssh",
        "-o", "StrictHostKeyChecking=no",
        "-o", "UserKnownHostsFile=/dev/null",
        "-o", "ConnectTimeout=15",
        `root@${ip}`,
        command,
      ],
      { env },
    );

    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (data: Buffer) => { stdout += data.toString(); });
    proc.stderr.on("data", (data: Buffer) => { stderr += data.toString(); });
    proc.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else resolve(stderr || `Exit code ${code}`);
    });
    proc.on("error", reject);

    setTimeout(() => {
      proc.kill();
      reject(new Error("timeout"));
    }, 15000);
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as { ip: string; password: string };
  const { ip, password } = body;

  if (!ip || !password || !/^[\d.]+$/.test(ip)) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const results: Record<string, string> = {};

  // 1. Read en_US keyboard layout to see the correct format
  try {
    results.en_US_layout = await runSsh(ip, password,
      "cat /home/root/.kbds/en_US/keyboard_layout.json 2>/dev/null || echo 'FILE_NOT_FOUND'");
  } catch {
    results.en_US_layout = "SSH_ERROR";
  }

  // 2. Read ko_KR keyboard layout (installed)
  try {
    results.ko_KR_layout = await runSsh(ip, password,
      "cat /home/root/.kbds/ko_KR/keyboard_layout.json 2>/dev/null || echo 'FILE_NOT_FOUND'");
  } catch {
    results.ko_KR_layout = "SSH_ERROR";
  }

  // 3. List all available keyboard layouts
  try {
    results.available_kbds = await runSsh(ip, password,
      "ls -la /home/root/.kbds/ 2>/dev/null || echo 'DIR_NOT_FOUND'");
  } catch {
    results.available_kbds = "SSH_ERROR";
  }

  // 4. Check xochitl journal logs for keyboard/layout errors
  try {
    results.xochitl_logs = await runSsh(ip, password,
      "journalctl -u xochitl --no-pager -n 100 2>/dev/null | grep -i -E 'keyboard|layout|kbd|json|parse|error|crash|segfault|PRELOAD|hangul' || echo 'NO_MATCHES'");
  } catch {
    results.xochitl_logs = "SSH_ERROR";
  }

  // 5. Check LD_PRELOAD status
  try {
    results.ld_preload = await runSsh(ip, password,
      "cat /proc/$(pidof xochitl 2>/dev/null || echo 1)/environ 2>/dev/null | tr '\\0' '\\n' | grep -i preload || echo 'NO_PRELOAD'");
  } catch {
    results.ld_preload = "SSH_ERROR";
  }

  // 6. Check if hangul_hook.so exists and is valid
  try {
    results.hook_file = await runSsh(ip, password,
      "ls -la /home/root/bt-keyboard/hangul_hook.so 2>/dev/null && file /home/root/bt-keyboard/hangul_hook.so 2>/dev/null || echo 'FILE_NOT_FOUND'");
  } catch {
    results.hook_file = "SSH_ERROR";
  }

  // 7. Check xochitl override
  try {
    results.xochitl_override = await runSsh(ip, password,
      "cat /etc/systemd/system/xochitl.service.d/override.conf 2>/dev/null || echo 'NO_OVERRIDE'");
  } catch {
    results.xochitl_override = "SSH_ERROR";
  }

  // 8. Firmware version
  try {
    results.firmware = await runSsh(ip, password,
      "cat /etc/version 2>/dev/null || echo 'UNKNOWN'");
  } catch {
    results.firmware = "SSH_ERROR";
  }

  // 9. xochitl binary patch status
  try {
    results.xochitl_patch = await runSsh(ip, password,
      `echo "=== Keyboard Path ===" && strings /usr/bin/xochitl | grep -E 'keyboards/|\.kbds/' && echo "=== Locale ===" && strings /usr/bin/xochitl | grep -E 'ko_KR|no_SV' && echo "=== MD5 ===" && md5sum /usr/bin/xochitl | cut -d' ' -f1 && echo "=== Backup ===" && ls -la /home/root/bt-keyboard/backup/xochitl.* 2>/dev/null || echo 'NO_BACKUP'`);
  } catch {
    results.xochitl_patch = "SSH_ERROR";
  }

  return NextResponse.json({ results });
}
