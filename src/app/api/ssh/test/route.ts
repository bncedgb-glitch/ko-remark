import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface SshTestRequest {
  ip: string;
  password: string;
}

function buildSshCommand(ip: string, password: string, command: string): string {
  // SECURITY: password passed via SSHPASS environment variable, not command line
  const escapedPassword = password.replace(/'/g, "'\\''");
  const escapedCommand = command.replace(/'/g, "'\\''");
  const sshOpts = "-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=10";
  return `SSHPASS='${escapedPassword}' sshpass -e ssh ${sshOpts} root@${ip} '${escapedCommand}'`;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as SshTestRequest;
  const { ip, password } = body;

  if (!ip || !password) {
    return NextResponse.json(
      { error: "IP and password required" },
      { status: 400 },
    );
  }

  // Validate IP format
  if (!/^[\d.]+$/.test(ip)) {
    return NextResponse.json(
      { error: "Invalid IP address format" },
      { status: 400 },
    );
  }

  try {
    const sshCmd = buildSshCommand(
      ip,
      password,
      "hostname; cat /etc/version 2>/dev/null || echo unknown; df -h /home | tail -1 | awk '{print $4}'; cat /proc/device-tree/model 2>/dev/null || echo unknown",
    );
    const extPath = `${process.env.PATH}:/opt/homebrew/bin:/usr/local/bin`;
    const { stdout } = await execAsync(sshCmd, { timeout: 15000, env: { ...process.env, PATH: extPath } });
    const lines = stdout.trim().split("\n");

    const model = (lines[3] ?? "unknown").replace(/\0/g, "").trim();

    // 기기 모델 자동 감지 (코드네임 기반)
    // Paper Pro = "Ferrari" (i.MX8MM)
    // Paper Pro Move = "Chiappa" (i.MX93)
    // reMarkable 2 등 기타 기기는 미지원
    const modelLower = model.toLowerCase();
    let detectedDevice: "paper-pro-move" | "paper-pro" | null = null;
    if (modelLower.includes("ferrari")) {
      detectedDevice = "paper-pro";
    } else if (modelLower.includes("chiappa")) {
      detectedDevice = "paper-pro-move";
    }

    return NextResponse.json({
      connected: true,
      hostname: lines[0] ?? "unknown",
      firmware: lines[1] ?? "unknown",
      freeSpace: lines[2] ?? "unknown",
      model,
      detectedDevice,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    let diagnosis = "연결에 실패했습니다.";
    if (msg.includes("REMOTE HOST IDENTIFICATION HAS CHANGED")) {
      diagnosis = "SSH 호스트 키가 변경되었습니다. known_hosts 파일을 확인하세요.";
    } else if (msg.includes("Permission denied")) {
      diagnosis = "SSH 비밀번호가 올바르지 않습니다.";
    } else if (msg.includes("Connection refused")) {
      diagnosis = "SSH 서비스가 응답하지 않습니다. USB 연결을 확인하세요.";
    } else if (msg.includes("timed out") || msg.includes("ETIMEDOUT")) {
      diagnosis = "연결 시간이 초과되었습니다. USB 케이블을 확인하세요.";
    } else if (msg.includes("command not found")) {
      diagnosis = "sshpass가 설치되어 있지 않습니다. brew install hudochenkov/sshpass/sshpass 를 실행하세요.";
    }
    return NextResponse.json({ connected: false, error: diagnosis });
  }
}
