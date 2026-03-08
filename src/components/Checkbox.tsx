"use client";

import type { ReactNode } from "react";

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

// 커스텀 스타일 체크박스 컴포넌트
// 네이티브 input은 sr-only로 숨기고 접근성 유지
export default function Checkbox({
  checked,
  onChange,
  label,
  description,
  disabled,
}: CheckboxProps): ReactNode {
  return (
    <label
      className={`flex items-start gap-4 py-5 px-6 rounded-xl cursor-pointer ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      style={{
        backgroundColor: checked ? "rgba(10,132,255,0.08)" : "rgba(255,255,255,0.55)",
        border: checked
          ? "1px solid rgba(10,132,255,0.34)"
          : "1px solid var(--border-light)",
        boxShadow: checked ? "var(--shadow-sm)" : "none",
        transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1), background-color 300ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 250ms cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* 체크박스 시각 요소 */}
      <div
        className="flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{
          width: "20px",
          height: "20px",
          backgroundColor: checked ? "var(--apple-blue)" : "rgba(255,255,255,0.72)",
          border: checked ? "none" : "1.5px solid rgba(126, 120, 111, 0.48)",
          borderRadius: "6px",
          transition: "all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          boxShadow: checked ? "var(--shadow-xs)" : "none",
        }}
      >
        {checked && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-checkmark"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
      {/* 스크린 리더용 숨겨진 네이티브 input */}
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="sr-only"
      />
      <div className="flex flex-col">
        <span
          className="text-[16px] font-medium leading-[1.5]"
          style={{ color: "var(--text-primary)" }}
        >
          {label}
        </span>
        {description && (
          <span
            className="text-[14px] mt-1.5 block leading-[1.6]"
            style={{ color: "var(--text-muted)" }}
          >
            {description}
          </span>
        )}
      </div>
    </label>
  );
}
