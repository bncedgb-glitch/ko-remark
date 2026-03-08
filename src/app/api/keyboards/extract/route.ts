import { NextRequest, NextResponse } from "next/server";
import { spawn, execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { getSshSessionFromRequest } from "@/lib/server/sshSession";

// 로케일 표시명
const LOCALE_NAMES: Record<string, string> = {
  da_DK: "Danish (dansk)",
  de_DE: "German (Deutsch)",
  el_GR: "Greek (Ελληνικά)",
  en_US: "English",
  es_ES: "Spanish (español)",
  et_EE: "Estonian (eesti)",
  fi_FI: "Finnish (suomi)",
  fr_FR: "French (français)",
  hu_HU: "Hungarian (magyar)",
  is_IS: "Icelandic (íslenska)",
  it_IT: "Italian (italiano)",
  ko_KR: "Korean (한국어)",
  nl_NL: "Dutch (Nederlands)",
  no_NO: "Norwegian (norsk)",
  pl_PL: "Polish (polski)",
  pt_PT: "Portuguese (português)",
  ro_RO: "Romanian (română)",
  sv_SE: "Swedish (svenska)",
};

const ZSTD_MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd]);
const CACHE_DIR = path.join(os.tmpdir(), "ko-remark-keyboards");

function scpDownload(
  ip: string,
  password: string,
  remotePath: string,
  localPath: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      SSHPASS: password,
      PATH: `${process.env.PATH}:/opt/homebrew/bin:/usr/local/bin`,
    };
    const proc = spawn(
      "sshpass",
      [
        "-e",
        "scp",
        "-o", "StrictHostKeyChecking=no",
        "-o", "UserKnownHostsFile=/dev/null",
        `root@${ip}:${remotePath}`,
        localPath,
      ],
      { env },
    );

    let stderr = "";
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `scp exit ${code}`));
    });
    proc.on("error", reject);
    setTimeout(() => { proc.kill(); reject(new Error("scp timeout")); }, 120000);
  });
}

interface KeyboardEntry {
  offset: number;
  compressedSize: number;
  json: string;
  parsed: Record<string, unknown>;
}

// Qt rcc 데이터 섹션에서 ZSTD 프레임 추출
// 포맷: [4바이트 BE 크기][ZSTD 압축 데이터]
function extractKeyboardsFromBinary(buf: Buffer): KeyboardEntry[] {
  const keyboards: KeyboardEntry[] = [];
  const zstdPath = getZstdPath();
  if (!zstdPath) return keyboards;

  // 모든 ZSTD 매직 바이트 위치 찾기
  const positions: number[] = [];
  let searchOffset = 0;
  while (true) {
    const idx = buf.indexOf(ZSTD_MAGIC, searchOffset);
    if (idx === -1) break;
    positions.push(idx);
    searchOffset = idx + 1;
  }

  const tmpZst = path.join(CACHE_DIR, "_frame.zst");
  const tmpOut = path.join(CACHE_DIR, "_frame.bin");

  for (const pos of positions) {
    if (pos < 4) continue;

    // Qt rcc 데이터 엔트리: [4바이트 크기(BE)][ZSTD 프레임]
    const dataSize = buf.readUInt32BE(pos - 4);
    if (dataSize < 10 || dataSize > 100000) continue;
    if (pos + dataSize > buf.length) continue;

    const frame = buf.subarray(pos, pos + dataSize);
    try {
      fs.writeFileSync(tmpZst, frame);
      execFileSync(zstdPath, ["-d", "-f", "-o", tmpOut, tmpZst], {
        stdio: "pipe",
        timeout: 5000,
      });
      const text = fs.readFileSync(tmpOut, "utf-8");

      // 키보드 JSON 확인
      if (!text.trimStart().startsWith("{")) continue;
      if (!text.includes('"alphabetic"')) continue;

      const parsed = JSON.parse(text) as Record<string, unknown>;
      keyboards.push({ offset: pos, compressedSize: dataSize, json: text, parsed });
    } catch {
      // 유효하지 않은 프레임 또는 키보드가 아닌 데이터
    }
  }

  try { fs.unlinkSync(tmpZst); } catch { /* ignore */ }
  try { fs.unlinkSync(tmpOut); } catch { /* ignore */ }

  return keyboards;
}

function getZstdPath(): string | null {
  const candidates = ["/opt/homebrew/bin/zstd", "/usr/local/bin/zstd", "/usr/bin/zstd"];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// 키보드 JSON 내용을 분석하여 로케일 식별
function identifyLocale(entry: KeyboardEntry): string | null {
  const json = entry.parsed;
  const hasInherits = "inherits" in json;
  const alpha = (json.alphabetic ?? []) as Array<Array<Record<string, string[]>>>;

  // 기본 키(default[0]) 추출
  const defaultKeys: string[][] = [];
  for (const row of alpha) {
    const rowKeys: string[] = [];
    for (const key of row) {
      if (key.default?.[0]) rowKeys.push(key.default[0]);
    }
    defaultKeys.push(rowKeys);
  }

  const row0 = defaultKeys[0]?.join("") ?? "";
  const row1 = defaultKeys[1]?.join("") ?? "";
  const row2 = defaultKeys[2]?.join("") ?? "";
  const allDefaults = row0 + row1 + row2;
  const fullText = entry.json;
  const sections = Object.keys(json).filter((k) => k !== "inherits");

  // 숫자 키패드
  if (!hasInherits && row0.match(/^[0-9]+$/) && allDefaults.match(/^[0-9]+$/)) {
    return "numeric";
  }

  // en_US 기본 레이아웃 (inherits 없음, 가장 큰 레이아웃)
  if (!hasInherits && sections.length >= 3 && row0.startsWith("qwerty")) {
    return "en_US";
  }

  // 그리스어 (그리스 문자)
  if (allDefaults.includes("ς") || allDefaults.includes("ε") || allDefaults.includes("ρ")) {
    return "el_GR";
  }

  // AZERTY → fr_FR
  if (row0.startsWith("az") && row1.startsWith("q")) {
    return "fr_FR";
  }

  // 아이슬란드어 (ð, þ 기본 키)
  if (allDefaults.includes("ð") && allDefaults.includes("þ")) {
    return "is_IS";
  }

  // 에스토니아어 (õ 기본 키 + ü, ö, ä)
  if (allDefaults.includes("õ") && allDefaults.includes("ü")) {
    return "et_EE";
  }

  // 헝가리어: QWERTZ + ű 또는 ő (헝가리어 고유 이중 악센트)
  if (row0.startsWith("qwertz") && (allDefaults.includes("ű") || allDefaults.includes("ő") || fullText.includes('"ű"') || fullText.includes('"ő"'))) {
    return "hu_HU";
  }

  // 독일어 QWERTZ + ü, ö, ä
  if (row0.startsWith("qwertz") && allDefaults.includes("ü") && allDefaults.includes("ö")) {
    return "de_DE";
  }

  // 일반 QWERTZ (ü/ö/ä 없는 중부유럽)
  if (row0.startsWith("qwertz") && !allDefaults.includes("ü")) {
    return "qwertz_generic";
  }

  // 스페인어 (ñ 기본 키)
  if (allDefaults.includes("ñ") && !allDefaults.includes("ç")) {
    return "es_ES";
  }

  // 포르투갈어 (ç 기본 키)
  if (allDefaults.includes("ç") && !allDefaults.includes("ñ")) {
    return "pt_PT";
  }

  // 스칸디나비아 레이아웃 구분
  if (allDefaults.includes("å")) {
    // 덴마크: æ ø 순서 (row1 끝)
    if (row1.includes("æ") && row1.indexOf("æ") < row1.indexOf("ø")) {
      return "da_DK";
    }
    // 노르웨이: ø æ 순서
    if (row1.includes("ø") && row1.indexOf("ø") < row1.indexOf("æ")) {
      return "no_NO";
    }
    // 스웨덴/핀란드: ö ä (ø/æ 없음)
    if (allDefaults.includes("ö") && allDefaults.includes("ä") && !allDefaults.includes("ø")) {
      return "sv_SE";
    }
  }

  // 루마니아어 (ț, ă, ș extended에서 확인)
  if (!hasInherits) return null;
  if (fullText.includes('"ț"') && fullText.includes('"ă"') && fullText.includes('"ș"')) {
    // 폴란드어도 확인
    if (fullText.includes('"ą"') && fullText.includes('"ę"') && fullText.includes('"ł"')) {
      // 둘 다 있으면 섹션 수로 구분 (pl_PL은 symbolic 섹션 있음)
      if (sections.includes("symbolic")) return "pl_PL";
    }
    return "ro_RO";
  }

  // 폴란드어 (ą, ę extended)
  if (fullText.includes('"ą"') && fullText.includes('"ę"')) {
    return "pl_PL";
  }

  // 이탈리아어: inherits + è와 (ì, ò, ù 중 하나)
  if (hasInherits && (allDefaults.includes("è") || fullText.includes('"è"')) &&
      (fullText.includes('"ì"') || fullText.includes('"ò"') || fullText.includes('"ù"'))) {
    return "it_IT";
  }

  // 네덜란드어: inherits + QWERTY + ĳ 이중모음
  if (hasInherits && row0.startsWith("qwerty") && fullText.includes('"ĳ"')) {
    return "nl_NL";
  }

  // en_GB 등 나머지 QWERTY+inherits: 배포하지 않음 (en_US와 중복 "English" 방지)
  return null;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = getSshSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "잘못된 파라미터입니다." }, { status: 400 });
  }

  const { ip, password } = session;

  // zstd CLI 확인
  if (!getZstdPath()) {
    return NextResponse.json(
      { error: "zstd가 설치되어 있지 않습니다. brew install zstd 를 실행하세요." },
      { status: 500 },
    );
  }

  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });

    // 캐시된 키보드 파일 확인
    const cachedLocales = fs.readdirSync(CACHE_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(".json", ""));
    if (cachedLocales.length > 0) {
      return buildResponse(cachedLocales);
    }

    // xochitl 다운로드
    const localXochitl = path.join(CACHE_DIR, "xochitl");
    if (!fs.existsSync(localXochitl)) {
      await scpDownload(ip, password, "/usr/bin/xochitl", localXochitl);
    }

    const binary = fs.readFileSync(localXochitl);
    const keyboards = extractKeyboardsFromBinary(binary);

    if (keyboards.length === 0) {
      return NextResponse.json(
        { error: "xochitl 바이너리에서 키보드를 찾을 수 없습니다." },
        { status: 500 },
      );
    }

    // 로케일 식별 및 캐시 저장
    const savedLocales: string[] = [];
    for (const kb of keyboards) {
      const locale = identifyLocale(kb);
      if (!locale || locale === "numeric" || locale === "qwertz_generic") continue;

      const cacheFile = path.join(CACHE_DIR, `${locale}.json`);
      fs.writeFileSync(cacheFile, kb.json);
      savedLocales.push(locale);
    }

    // fi_FI가 없으면 sv_SE 복사 (동일 레이아웃)
    if (!savedLocales.includes("fi_FI") && savedLocales.includes("sv_SE")) {
      const svFile = path.join(CACHE_DIR, "sv_SE.json");
      const fiFile = path.join(CACHE_DIR, "fi_FI.json");
      fs.copyFileSync(svFile, fiFile);
      savedLocales.push("fi_FI");
    }

    return buildResponse(savedLocales);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function buildResponse(savedLocales: string[]): NextResponse {
  const result = savedLocales
    .filter((l) => l !== "qwertz_generic")
    .map((locale) => ({
      locale,
      name: LOCALE_NAMES[locale] ?? locale,
      required: locale === "en_US" || locale === "ko_KR",
    }));

  // ko_KR 추가 (레포에서 제공)
  if (!result.some((r) => r.locale === "ko_KR")) {
    result.push({
      locale: "ko_KR",
      name: LOCALE_NAMES.ko_KR,
      required: true,
    });
  }

  // 정렬: 필수 먼저, 그 다음 알파벳 순
  result.sort((a, b) => {
    if (a.required !== b.required) return a.required ? -1 : 1;
    return a.locale.localeCompare(b.locale);
  });

  return NextResponse.json({
    locales: result,
    total: result.length,
    cached: true,
  });
}
