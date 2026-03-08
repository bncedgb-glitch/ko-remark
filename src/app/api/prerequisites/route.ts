import { NextResponse } from "next/server";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import os from "os";
import fs from "fs";

const execAsync = promisify(exec);

// brew 설치 경로 (Apple Silicon / Intel)
const BREW_PATHS = ["/opt/homebrew/bin/brew", "/usr/local/bin/brew"];

// brew 설치 도구들이 위치하는 추가 경로
const EXTRA_BIN_DIRS = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/local/go/bin"];

interface ToolStatus {
  name: string;
  command: string;
  installed: boolean;
}

function isMac(): boolean {
  return os.platform() === "darwin";
}

function getExtendedPath(): string {
  return `${process.env.PATH}:${EXTRA_BIN_DIRS.join(":")}`;
}

async function findBrewPath(): Promise<string | null> {
  for (const p of BREW_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  try {
    const { stdout } = await execAsync("which brew", {
      env: { ...process.env, PATH: getExtendedPath() },
    });
    return stdout.trim();
  } catch {
    return null;
  }
}

async function isToolInstalled(command: string): Promise<boolean> {
  try {
    await execAsync(`which ${command}`, {
      env: { ...process.env, PATH: getExtendedPath() },
    });
    return true;
  } catch {
    return false;
  }
}

// GET: 상태 확인 (폴링용, 빠르게 반환)
export async function GET(): Promise<NextResponse> {
  const brewPath = await findBrewPath();
  const brewMissing = isMac() && !brewPath;

  const toolDefs = [
    { name: "ssh", command: "ssh" },
    { name: "scp", command: "scp" },
    { name: "sshpass", command: "sshpass" },
    { name: "zstd (키보드 추출용)", command: "zstd" },
    { name: "go (크로스 컴파일용)", command: "go" },
    { name: "zig (C 크로스 컴파일용)", command: "zig" },
  ];

  const tools: ToolStatus[] = [];
  for (const def of toolDefs) {
    tools.push({
      name: def.name,
      command: def.command,
      installed: await isToolInstalled(def.command),
    });
  }

  const allReady = !brewMissing && tools.every((t) => t.installed);

  return NextResponse.json({ tools, allReady, brewMissing });
}

// POST: 자동 설치 액션
export async function POST(request: Request): Promise<NextResponse> {
  let body: { action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { action } = body;

  // Homebrew 설치: Terminal.app에서 자동 실행
  if (action === "open-brew-install") {
    if (!isMac()) {
      return NextResponse.json({ error: "macOS에서만 지원" }, { status: 400 });
    }
    try {
      const appleScript = [
        'tell application "Terminal"',
        "  activate",
        '  do script "/bin/bash -c \\"$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\\""',
        "end tell",
      ].join("\n");

      await new Promise<void>((resolve, reject) => {
        const proc = spawn("osascript", ["-e", appleScript]);
        proc.on("close", (code) => {
          if (code === 0) resolve();
          else reject(new Error(`osascript exit code ${code}`));
        });
        proc.on("error", reject);
      });
      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json(
        { error: "터미널을 열 수 없습니다" },
        { status: 500 },
      );
    }
  }

  // 도구 자동 설치 (brew 사용)
  if (action === "install-tools") {
    const brewPath = await findBrewPath();
    if (!brewPath) {
      return NextResponse.json(
        { error: "Homebrew가 설치되어 있지 않습니다" },
        { status: 400 },
      );
    }

    const extEnv = { ...process.env, PATH: getExtendedPath() };
    const results: Record<string, boolean> = {};

    const installMap: [string, string][] = [
      ["sshpass", `${brewPath} install hudochenkov/sshpass/sshpass`],
      ["zstd", `${brewPath} install zstd`],
      ["go", `${brewPath} install go`],
      ["zig", `${brewPath} install zig`],
    ];

    for (const [tool, command] of installMap) {
      if (await isToolInstalled(tool)) {
        results[tool] = true;
        continue;
      }
      try {
        await execAsync(command, { timeout: 300000, env: extEnv });
        results[tool] = await isToolInstalled(tool);
      } catch {
        results[tool] = false;
      }
    }

    return NextResponse.json({ results });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
