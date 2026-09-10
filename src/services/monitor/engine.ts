import cron from "node-cron";
import { prisma } from "../../db";
import { SeatProvider } from "./types";
import { sendPushToAllDevices } from "../push";
import { logger } from "../../utils/logger";

const ALERT_COOLDOWN_MINUTES = 10; // 같은 조건에 대해 이 시간 안엔 중복 알림을 보내지 않음

export function startMonitorEngine(provider: SeatProvider, intervalSeconds: number) {
  // node-cron은 분 단위가 기본이라, 초 단위 간격은 */N * * * * * 형식으로 표현합니다.
  const cronExpr = `*/${intervalSeconds} * * * * *`;

  logger.info(`모니터링 엔진 시작 (${intervalSeconds}초 간격)`);

  const task = cron.schedule(cronExpr, async () => {
    try {
      await runOnce(provider);
    } catch (err) {
      logger.error("모니터링 주기 실행 중 오류", err);
    }
  });

  return task;
}

async function runOnce(provider: SeatProvider) {
  const activeConditions = await prisma.watchCondition.findMany({
    where: { isActive: true },
  });

  for (const condition of activeConditions) {
    const result = await provider.checkAvailability(condition);

    await prisma.watchCondition.update({
      where: { id: condition.id },
      data: { lastCheckedAt: new Date() },
    });

    if (!result.available) continue;

    const recentAlert = await prisma.alert.findFirst({
      where: {
        conditionId: condition.id,
        createdAt: { gte: new Date(Date.now() - ALERT_COOLDOWN_MINUTES * 60_000) },
      },
    });
    if (recentAlert) continue; // 최근에 이미 알림을 보냈으면 스킵 (중복 방지)

    const message = `${condition.departure}→${condition.arrival} ${condition.date} · ${
      result.detail ?? "좌석 발생"
    }`;

    await prisma.alert.create({
      data: { conditionId: condition.id, message },
    });

    await sendPushToAllDevices("취소표 발생!", message);
    logger.info("알림 발송", { conditionId: condition.id, message });
  }
}
