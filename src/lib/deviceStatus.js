export function deriveRuntimeState({
  installKeypad,
  installBt,
}) {
  if (installKeypad && installBt) return "both";
  if (installKeypad) return "keypad_only";
  if (installBt) return "bt_only";
  return "clean";
}

export function getRuntimeStateLabel(runtimeState) {
  switch (runtimeState) {
    case "both":
      return "온스크린 + 블루투스";
    case "keypad_only":
      return "온스크린만 설치됨";
    case "bt_only":
      return "블루투스만 설치됨";
    default:
      return "원본 상태";
  }
}

export function getSafetyStatus({
  connected,
  supported = true,
  runtimeState,
  hasHomeBackup,
  hasOptBackup,
}) {
  if (!connected) {
    return {
      tone: "neutral",
      label: "연결 필요",
      description: "USB 연결과 SSH 비밀번호를 확인하면 기기 상태를 읽습니다.",
    };
  }

  if (!supported) {
    return {
      tone: "danger",
      label: "미지원 기기",
      description: "Paper Pro 계열만 지원합니다.",
    };
  }

  if ((runtimeState === "keypad_only" || runtimeState === "both") && !hasHomeBackup && !hasOptBackup) {
    return {
      tone: "danger",
      label: "복구 차단 상태",
      description: "온스크린 패치는 남아 있지만 원본 백업이 없어 추가 설치를 차단합니다.",
    };
  }

  if (runtimeState === "clean" || runtimeState === "bt_only") {
    return {
      tone: "safe",
      label: "보증 영향 낮음",
      description: runtimeState === "clean"
        ? "현재는 원본 상태입니다."
        : "현재는 블루투스 경로만 설치되어 있습니다.",
    };
  }

  return {
    tone: "caution",
    label: "보증 영향 있음",
    description: "온스크린 패치가 활성화되어 있으므로 원상복구와 백업 상태를 항상 확인해야 합니다.",
  };
}

export function getRecommendedAction({
  connected,
  supported = true,
  runtimeState,
  hasRecoveryRisk,
}) {
  if (!connected) {
    return {
      id: "connect",
      title: "기기 연결 확인",
      description: "USB 연결과 SSH 비밀번호를 먼저 확인하세요.",
      href: "/",
    };
  }

  if (!supported) {
    return {
      id: "unsupported",
      title: "지원 기기 확인",
      description: "지원 모델인지 다시 확인하세요.",
      href: "/",
    };
  }

  if (hasRecoveryRisk) {
    return {
      id: "restore-first",
      title: "원상복구 우선",
      description: "추가 설치 전에 원본 백업 상태를 먼저 복구해야 합니다.",
      href: "/uninstall",
    };
  }

  if (runtimeState === "clean") {
    return {
      id: "safe-install",
      title: "안전 설치 시작",
      description: "블루투스 한글 입력부터 설치하는 것을 권장합니다.",
      href: "/install?mode=bt",
    };
  }

  if (runtimeState === "bt_only") {
    return {
      id: "advanced-install",
      title: "고급 설치 계속",
      description: "온스크린 키패드를 추가해 전체 기능을 완성합니다.",
      href: "/install?mode=keypad&next=bluetooth",
    };
  }

  if (runtimeState === "keypad_only") {
    return {
      id: "add-bt",
      title: "블루투스 추가",
      description: "현재 온스크린은 설치되어 있습니다. BT 입력을 추가하면 전체 구성이 됩니다.",
      href: "/install?mode=bt",
    };
  }

  return {
    id: "pair-bt",
    title: "블루투스 페어링",
    description: "현재 설치는 끝났습니다. 키보드 연결과 입력 확인으로 넘어가세요.",
    href: "/bluetooth",
  };
}

export function buildFailureRoutines({
  connected,
  runtimeState,
  checks,
  hasRecoveryRisk,
}) {
  if (!connected) {
    return [
      {
        id: "usb-connection",
        title: "USB 연결 확인",
        steps: [
          "USB 케이블을 다시 연결합니다.",
          "기기에서 개발자 모드와 SSH가 활성화되어 있는지 확인합니다.",
          "설정 화면의 SSH 비밀번호를 다시 입력합니다.",
        ],
      },
    ];
  }

  const routines = [];
  const failingChecks = new Set(checks.filter((check) => !check.pass).map((check) => check.id));

  if (hasRecoveryRisk) {
    routines.push({
      id: "recovery-risk",
      title: "원상복구 우선",
      steps: [
        "현재 상태에서는 추가 설치를 진행하지 않습니다.",
        "원상복구를 실행해 원본 경로(:/misc/keyboards/) 복귀 여부를 먼저 확인합니다.",
        "원본 백업이 다시 확보된 뒤에만 온스크린 설치를 재시도합니다.",
      ],
    });
  }

  if (failingChecks.has("bt-daemon") || failingChecks.has("bt-runtime")) {
    routines.push({
      id: "bt-recovery",
      title: "블루투스 복구 루틴",
      steps: [
        "기기와 키보드의 블루투스를 모두 한 번 껐다 켭니다.",
        "키보드를 pairing mode로 다시 넣고 재연결합니다.",
        "필요하면 전체삭제 후 BT만 다시 설치합니다.",
      ],
    });
  }

  if (failingChecks.has("keypad-hook") || failingChecks.has("kbds")) {
    routines.push({
      id: "keypad-recovery",
      title: "온스크린 복구 루틴",
      steps: [
        "원상복구 없이 추가 패치를 덮어쓰지 않습니다.",
        "현재 상태 카드에서 원본 백업 존재 여부를 확인합니다.",
        "문제가 지속되면 전체삭제 후 온스크린만 다시 설치합니다.",
      ],
    });
  }

  if (failingChecks.has("inactive-slot")) {
    routines.push({
      id: "update-recovery",
      title: "업데이트 슬롯 재준비",
      steps: [
        "현재 설치 상태에서 설치를 한 번 더 실행합니다.",
        "업데이트 직전에는 기기 상태 카드에서 '업데이트 슬롯 준비됨'을 다시 확인합니다.",
      ],
    });
  }

  if (routines.length === 0) {
    routines.push({
      id: "default-check",
      title: "다음 확인 순서",
      steps: runtimeState === "both"
        ? [
            "온스크린에서 한글 자모 조합을 확인합니다.",
            "블루투스 키보드에서 한영 전환과 입력을 확인합니다.",
            "필요하면 원상복구 전에 로그를 저장해둡니다.",
          ]
        : [
            "권장 작업 카드를 따라 다음 단계로 진행합니다.",
            "이상 징후가 있으면 원상복구보다 먼저 상태 카드를 다시 새로고침합니다.",
          ],
    });
  }

  return routines;
}

export function buildOperationTimeline({
  connected,
  runtimeState,
  checks,
}) {
  const passing = new Set(checks.filter((check) => check.pass).map((check) => check.id));

  return [
    {
      id: "connection",
      label: "기기 연결",
      status: connected ? "done" : "pending",
      detail: connected ? "USB/SSH 확인됨" : "연결 전",
    },
    {
      id: "runtime",
      label: "현재 상태",
      status: connected ? "done" : "pending",
      detail: getRuntimeStateLabel(runtimeState),
    },
    {
      id: "reboot",
      label: "재부팅 유지",
      status: passing.has("reboot-ready") ? "done" : "pending",
      detail: passing.has("reboot-ready") ? "활성 런타임 준비됨" : "점검 필요",
    },
    {
      id: "update",
      label: "업데이트 슬롯",
      status: passing.has("inactive-slot") ? "done" : "pending",
      detail: passing.has("inactive-slot") ? "비활성 슬롯 준비됨" : "재준비 필요",
    },
    {
      id: "factory",
      label: "팩토리리셋 정리",
      status: passing.has("factory-guard") ? "done" : runtimeState === "clean" ? "done" : "pending",
      detail: passing.has("factory-guard") || runtimeState === "clean" ? "정리 경로 준비됨" : "가드 점검 필요",
    },
  ];
}
