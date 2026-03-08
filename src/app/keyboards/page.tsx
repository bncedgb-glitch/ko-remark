"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import StepIndicator from "@/components/StepIndicator";
import Button from "@/components/Button";
import { useSetup } from "@/lib/store";
import { useGuard } from "@/lib/useGuard";
import { ensureSshSession } from "@/lib/client/sshSession";

interface LocaleInfo {
  locale: string;
  name: string;
  required: boolean;
}

export default function KeyboardsPage() {
  const allowed = useGuard();
  const router = useRouter();
  const { state, setState } = useSetup();
  const [locales, setLocales] = useState<LocaleInfo[]>([]);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(state.selectedLocales),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLocales = useCallback(async () => {
    if (!allowed) return;
    setLoading(true);
    setError(null);
    try {
      await ensureSshSession(state.ip, state.password);
      const res = await fetch("/api/keyboards/extract");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "키보드 추출에 실패했습니다.");
        return;
      }
      setLocales(data.locales);
      // 필수 로케일은 항상 선택
      setSelected((prev) => {
        const required = new Set(prev);
        for (const l of data.locales as LocaleInfo[]) {
          if (l.required) required.add(l.locale);
        }
        return required;
      });
    } catch {
      setError("서버에 연결할 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }, [allowed, state.ip, state.password]);

  useEffect(() => {
    fetchLocales();
  }, [fetchLocales]);

  if (!allowed) return null;

  const toggleLocale = (locale: string, required: boolean) => {
    if (required) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(locale)) next.delete(locale);
      else next.add(locale);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelected(new Set(locales.map((l) => l.locale)));
  };

  const handleDeselectOptional = () => {
    setSelected(new Set(locales.filter((l) => l.required).map((l) => l.locale)));
  };

  const handleNext = () => {
    setState({
      selectedLocales: Array.from(selected),
      localesConfigured: true,
    });
    router.push("/install");
  };

  return (
    <div className="animate-fade-in-up">
      <StepIndicator currentStep={3} />

      <div className="space-y-10">
        <div>
          <h1
            className="text-[36px] font-bold leading-tight"
            style={{ color: "var(--text-primary)" }}
          >
            키보드 선택
          </h1>
          <p
            className="mt-3 text-[17px]"
            style={{ color: "var(--text-muted)" }}
          >
            설치할 키보드 레이아웃을 선택하세요.
          </p>
        </div>

        {/* 로딩 */}
        {loading && (
          <div
            className="py-8 text-center rounded-xl"
            style={{ backgroundColor: "var(--bg-secondary)" }}
          >
            <div className="flex items-center justify-center gap-3">
              <span className="inline-flex gap-1" style={{ color: "var(--accent)" }}>
                {[0, 1, 2].map((i) => (
                  <span key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: "currentColor", animation: "dotBounce 1.4s ease-in-out infinite", animationDelay: `${i * 0.16}s` }} />
                ))}
              </span>
              <span
                className="text-[16px]"
                style={{ color: "var(--text-muted)" }}
              >
                기기에서 키보드 레이아웃을 추출하는 중...
              </span>
            </div>
          </div>
        )}

        {/* 에러 */}
        {error && !loading && (
          <div className="space-y-4">
            <div
              className="p-6 rounded-xl"
              style={{
                backgroundColor: "var(--error-light)",
                color: "var(--error)",
              }}
            >
              <p className="text-[17px] font-medium">{error}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={fetchLocales}>
              재시도
            </Button>
          </div>
        )}

        {/* 로케일 목록 */}
        {!loading && !error && locales.length > 0 && (
          <div className="space-y-4 stagger-1">
            <div className="flex items-center justify-between">
              <span
                className="text-[12px] font-semibold uppercase tracking-[0.12em]"
                style={{
                  color: "var(--text-muted)",
                  backgroundColor: "var(--bg-secondary)",
                  padding: "5px 14px",
                  borderRadius: "var(--radius-full)",
                  border: "1px solid var(--border-light)",
                }}
              >
                {selected.size}개 선택됨
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                  전체 선택
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeselectOptional}
                >
                  필수만
                </Button>
              </div>
            </div>

            <div
              className="rounded-xl overflow-hidden"
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border-light)",
              }}
            >
              {locales.map((locale) => {
                const isSelected = selected.has(locale.locale);
                return (
                  <button
                    key={locale.locale}
                    onClick={() =>
                      toggleLocale(locale.locale, locale.required)
                    }
                    className="w-full flex items-center justify-between px-6 py-4 text-left transition-all duration-150"
                    style={{
                      borderBottom: "1px solid var(--border-light)",
                      backgroundColor: isSelected
                        ? "var(--accent-light)"
                        : "transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = "var(--bg-secondary)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                    }}
                    disabled={locale.required}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-[22px] h-[22px] rounded-[6px] flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: isSelected
                            ? "var(--accent)"
                            : "transparent",
                          border: isSelected
                            ? "none"
                            : "2px solid var(--border)",
                        }}
                      >
                        {isSelected && (
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="white"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <span
                          className="text-[16px] font-medium"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {locale.name}
                        </span>
                        <span
                          className="text-[14px] ml-2"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {locale.locale}
                        </span>
                      </div>
                    </div>
                    {locale.required && (
                      <span
                        className="text-[12px] font-medium"
                        style={{
                          backgroundColor: "var(--bg-secondary)",
                          color: "var(--text-muted)",
                          borderRadius: "9999px",
                          padding: "4px 12px",
                        }}
                      >
                        필수
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 네비게이션 */}
        <div className="flex justify-between pt-4">
          <Button
            variant="ghost"
            onClick={() => router.push("/install")}
          >
            이전
          </Button>
          <Button
            onClick={handleNext}
            disabled={loading || selected.size === 0}
            size="lg"
          >
            다음
          </Button>
        </div>
      </div>
    </div>
  );
}
