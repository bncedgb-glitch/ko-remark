import { exec } from "child_process";
import { promisify } from "util";
import os from "os";
import fs from "fs";

const execAsync = promisify(exec);

const BREW_PATHS = ["/opt/homebrew/bin/brew", "/usr/local/bin/brew"];
const EXTRA_BIN_DIRS = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/local/go/bin"];

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

export async function GET(): Promise<Response> {
  if (os.platform() !== "darwin") {
    return new Response("macOS only", { status: 400 });
  }

  const brewPath = await findBrewPath();
  if (!brewPath) {
    return new Response("Homebrew not found", { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: Record<string, unknown>): void => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      const extEnv = { ...process.env, PATH: getExtendedPath() };

      const installMap: { tool: string; label: string; command: string }[] = [
        { tool: "sshpass", label: "sshpass", command: `${brewPath} install hudochenkov/sshpass/sshpass` },
        { tool: "zstd", label: "zstd (키보드 추출용)", command: `${brewPath} install zstd` },
        { tool: "go", label: "go (크로스 컴파일용)", command: `${brewPath} install go` },
        { tool: "zig", label: "zig (C 크로스 컴파일용)", command: `${brewPath} install zig` },
      ];

      const total = installMap.length;
      let completed = 0;

      try {
        for (const { tool, label, command } of installMap) {
          const alreadyInstalled = await isToolInstalled(tool);
          if (alreadyInstalled) {
            completed++;
            send("tool", { tool, label, status: "installed", progress: Math.round((completed / total) * 100) });
            continue;
          }

          send("tool", { tool, label, status: "installing", progress: Math.round((completed / total) * 100) });

          try {
            const { stdout } = await execAsync(command, { timeout: 300000, env: extEnv });
            const lastLine = stdout.trim().split("\n").pop() ?? "";
            const installed = await isToolInstalled(tool);
            completed++;
            send("tool", {
              tool,
              label,
              status: installed ? "installed" : "failed",
              detail: lastLine,
              progress: Math.round((completed / total) * 100),
            });
          } catch (err: unknown) {
            completed++;
            const msg = err instanceof Error ? err.message : String(err);
            send("tool", { tool, label, status: "failed", detail: msg, progress: Math.round((completed / total) * 100) });
          }
        }

        send("complete", { progress: 100 });
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        send("error", { message: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
