import type { ReactNode } from "react";

interface SectionDividerProps {
  label: string;
}

// 섹션 구분 컴포넌트
// 모던 필 스타일 라벨 디자인 + 좌측 액센트 바
export default function SectionDivider({
  label,
}: SectionDividerProps): ReactNode {
  return (
    <div style={{ paddingTop: "4px", paddingBottom: "4px" }}>
      <div className="flex items-center gap-3">
        {/* 좌측 액센트 바 */}
        <div
          className="flex-shrink-0"
          style={{
            width: "2px",
            height: "16px",
            backgroundColor: "var(--apple-blue)",
            borderRadius: "2px",
          }}
        />
        <span
          className="text-[12px] font-semibold uppercase tracking-[0.12em] flex-shrink-0"
          style={{
            color: "var(--text-muted)",
            backgroundColor: "rgba(255,255,255,0.72)",
            padding: "5px 12px",
            borderRadius: "var(--radius-full)",
            border: "1px solid var(--border-light)",
            letterSpacing: "0.12em",
          }}
        >
          {label}
        </span>
        <div
          className="flex-1"
          style={{
            height: "1px",
            background: "linear-gradient(to right, var(--border-light), transparent)",
          }}
        />
      </div>
    </div>
  );
}
