import type { ReactNode } from "react";

interface ProgressBarProps {
  progress: number;
  status?: "active" | "complete" | "error";
  currentStep?: string;
}

// 진행률 표시 바 컴포넌트
// active 상태에서 쉬머 애니메이션, complete 상태에서 그라데이션, error 상태에서 단색 표시
export default function ProgressBar({
  progress,
  status = "active",
  currentStep,
}: ProgressBarProps): ReactNode {
  const isComplete = progress >= 100 && status === "complete";

  // 상태별 채움 그라데이션
  const fillBackground =
    status === "error"
      ? "var(--error)"
      : status === "complete"
        ? "linear-gradient(90deg, #22c55e 0%, #16a34a 100%)"
        : "linear-gradient(90deg, #67a6ff 0%, var(--apple-blue) 100%)";

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        {currentStep && (
          <span
            className="text-[16px]"
            style={{ color: "var(--text-secondary)" }}
          >
            {currentStep}
          </span>
        )}
        <span
          className="text-[15px] font-mono"
          style={{
            color: "var(--text-muted)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {progress}%
        </span>
      </div>
      {/* 진행률 바 트랙 */}
      <div
        className="h-2 overflow-hidden rounded-full"
        style={{
          backgroundColor: "rgba(17,24,39,0.08)",
          boxShadow: "inset 0 1px 2px rgba(15,23,42,0.05)",
        }}
      >
        {/* 진행률 바 채움 영역 */}
        <div
          className="h-full rounded-full relative"
          style={{
            width: `${progress}%`,
            background: fillBackground,
            transition: "width 500ms cubic-bezier(0.4, 0, 0.2, 1)",
            ...(isComplete
              ? { animation: "completionPulse 600ms ease-out" }
              : {}),
          }}
        >
          {/* 쉬머 오버레이 (active 상태에서만) */}
          {status === "active" && progress < 100 && progress > 0 && (
            <div
              className="absolute inset-0 rounded-full"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.5s ease-in-out infinite",
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
