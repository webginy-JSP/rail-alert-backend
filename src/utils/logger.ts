import fs from "fs";
import path from "path";

const LOG_DIR = path.join(process.cwd(), "logs");
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

type Level = "info" | "warn" | "error" | "debug";

function currentLogFile() {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return path.join(LOG_DIR, `app-${date}.log`);
}

function write(level: Level, message: string, meta?: unknown) {
  const entry = {
    time: new Date().toISOString(),
    level,
    message,
    ...(meta !== undefined ? { meta: serializeMeta(meta) } : {}),
  };
  const line = JSON.stringify(entry);

  // 콘솔에도 사람이 읽기 좋은 형태로 출력
  const consoleFn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  consoleFn(`[${entry.time}] [${level.toUpperCase()}] ${message}`, meta ?? "");

  fs.appendFile(currentLogFile(), line + "\n", (err) => {
    if (err) console.error("[logger] 로그 파일 쓰기 실패:", err);
  });
}

function serializeMeta(meta: unknown) {
  if (meta instanceof Error) {
    return { name: meta.name, message: meta.message, stack: meta.stack };
  }
  return meta;
}

export const logger = {
  info: (message: string, meta?: unknown) => write("info", message, meta),
  warn: (message: string, meta?: unknown) => write("warn", message, meta),
  error: (message: string, meta?: unknown) => write("error", message, meta),
  debug: (message: string, meta?: unknown) => write("debug", message, meta),
};

// 오래된 로그가 무한히 쌓이지 않도록, 시작 시 30일 지난 로그 파일은 정리합니다.
export function cleanupOldLogs(days = 30) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  for (const file of fs.readdirSync(LOG_DIR)) {
    const full = path.join(LOG_DIR, file);
    const stat = fs.statSync(full);
    if (stat.mtimeMs < cutoff) fs.unlinkSync(full);
  }
}
