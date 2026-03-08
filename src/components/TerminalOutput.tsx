"use client";

import { useEffect, useRef } from "react";

interface TerminalOutputProps {
  lines: string[];
  maxHeight?: string;
}

// 터미널 라인 분류 함수
function classifyLine(line: string): "error" | "success" | "warn" | "info" | "heading" | "default" {
  if (line.startsWith("ERROR") || line.startsWith("FAIL")) return "error";
  if (line.startsWith("OK") || line.includes("\u2713")) return "success";
  if (line.startsWith("SKIP") || line.startsWith("WARN")) return "warn";
  if (line.startsWith("===")) return "heading";
  if (line.startsWith(">") || line.startsWith("$")) return "info";
  return "default";
}

// 라인 타입별 색상 매핑 (밝고 선명한 구문 강조)
const lineColors: Record<ReturnType<typeof classifyLine>, string> = {
  error: "#f87171",
  success: "#4ade80",
  warn: "#fbbf24",
  info: "#60a5fa",
  heading: "#818cf8",
  default: "#e2e8f0",
};

export default function TerminalOutput({
  lines,
  maxHeight = "280px",
}: TerminalOutputProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  return (
    <div
      className="overflow-hidden rounded-xl"
      style={{
        background: "linear-gradient(180deg, #171d28 0%, #1d2430 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), var(--shadow-md)",
      }}
    >
      {/* macOS 스타일 툴바 (프로스티드 블러) */}
      <div
        className="flex items-center gap-2 px-4 py-2.5"
        style={{
          backgroundColor: "rgba(23, 29, 40, 0.92)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div className="flex gap-1.5">
          <div className="w-[10px] h-[10px] rounded-full" style={{ backgroundColor: "#f87171" }} />
          <div className="w-[10px] h-[10px] rounded-full" style={{ backgroundColor: "#fbbf24" }} />
          <div className="w-[10px] h-[10px] rounded-full" style={{ backgroundColor: "#4ade80" }} />
        </div>
        <span className="text-[11px] ml-2 font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>
          terminal
        </span>
      </div>

      {/* 터미널 본문 */}
      <div
        className="font-mono text-[12px] leading-[20px] p-5 overflow-y-auto terminal-scroll"
        style={{
          color: "#e2e8f0",
          maxHeight,
          boxShadow: "inset 0 10px 18px -12px rgba(0,0,0,0.2)",
        }}
      >
        {lines.length === 0 ? (
          <span style={{ color: "#666" }}>대기 중...</span>
        ) : (
          lines.map((line, i) => {
            const type = classifyLine(line);
            return (
              <div
                key={i}
                className="whitespace-pre-wrap"
                style={{
                  color: lineColors[type],
                  fontWeight: type === "heading" ? 600 : 400,
                  // 성능 최적화: 마지막 20줄만 애니메이션 적용
                  ...(i >= lines.length - 20
                    ? { animation: "terminalLine 200ms cubic-bezier(0.4, 0, 0.2, 1) both" }
                    : {}),
                }}
              >
                {line}
              </div>
            );
          })
        )}
        {/* 깜빡이는 커서 블록 */}
        {lines.length > 0 && (
          <span
            style={{
              display: "inline-block",
              width: "7px",
              height: "14px",
              backgroundColor: "#4ade80",
              animation: "cursorBlink 1s step-end infinite",
              marginLeft: "2px",
              verticalAlign: "middle",
            }}
          />
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
