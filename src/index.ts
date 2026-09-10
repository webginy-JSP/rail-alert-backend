import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { prisma } from "./db";
import { conditionsRouter } from "./routes/conditions";
import { deviceTokenRouter } from "./routes/deviceToken";
import { apiKeyAuth } from "./middleware/auth";
import { startMonitorEngine } from "./services/monitor/engine";
import { MockSeatProvider } from "./services/monitor/mockProvider";
import { logger, cleanupOldLogs } from "./utils/logger";

cleanupOldLogs();

// 예상치 못한 오류도 반드시 로그 파일에 남깁니다 (서버가 조용히 죽는 걸 방지)
process.on("uncaughtException", (err) => {
  logger.error("uncaughtException - 처리되지 않은 예외", err);
});
process.on("unhandledRejection", (reason) => {
  logger.error("unhandledRejection - 처리되지 않은 Promise 거부", reason);
});

const app = express();
app.use(cors());
app.use(express.json());

// 모든 요청을 로그 파일에 기록 (요청/응답 시간, 상태코드)
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    logger.info(`${req.method} ${req.originalUrl} -> ${res.statusCode}`, {
      durationMs: Date.now() - start,
    });
  });
  next();
});

app.get("/health", (_req, res) => res.json({ ok: true }));

// GET /alerts - 모든 조건에 걸친 알림 히스토리 (앱의 "알림 내역" 화면용)
app.get("/alerts", apiKeyAuth, async (_req, res) => {
  const alerts = await prisma.alert.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json(alerts);
});

// 최근 로그를 확인용으로 조회하는 엔드포인트 (문제 생겼을 때 서버 터미널 없이도 확인 가능)
app.get("/logs/recent", apiKeyAuth, (_req, res) => {
  const date = new Date().toISOString().slice(0, 10);
  const file = path.join(process.cwd(), "logs", `app-${date}.log`);
  if (!fs.existsSync(file)) return res.json({ lines: [] });

  const lines = fs
    .readFileSync(file, "utf-8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .slice(-200) // 최근 200줄만
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return { raw: l };
      }
    });
  res.json({ lines });
});

app.use("/conditions", apiKeyAuth, conditionsRouter);
app.use("/device-tokens", apiKeyAuth, deviceTokenRouter);

// 라우터에서 던진 에러를 최종적으로 잡아 로그에 남기는 핸들러 (반드시 마지막에 등록)
app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error(`처리되지 않은 요청 에러: ${req.method} ${req.originalUrl}`, err);
  res.status(500).json({ error: "internal server error" });
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  logger.info(`서버 시작: http://localhost:${port}`);
});

// 모니터링 엔진 시작 - 지금은 MockSeatProvider(가짜 데이터)를 사용합니다.
// 실제 코레일/SRT 연동 로직을 만들면 이 부분만 교체하면 됩니다.
const intervalSeconds = Number(process.env.MONITOR_INTERVAL_SECONDS ?? 30);
startMonitorEngine(new MockSeatProvider(0.15), intervalSeconds);
