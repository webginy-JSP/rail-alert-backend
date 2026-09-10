import * as admin from "firebase-admin";
import { prisma } from "../db";
import { logger } from "../utils/logger";

let initialized = false;

function ensureFirebase() {
  if (initialized) return true;
  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!path) return false;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const serviceAccount = require(path);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    initialized = true;
    return true;
  } catch (err) {
    logger.error("Firebase 초기화 실패", err);
    return false;
  }
}

// 등록된 모든 디바이스에 푸시를 보냅니다.
// Firebase 설정이 안 되어 있으면 실제 발송 대신 콘솔에만 출력합니다 (개발/테스트용).
export async function sendPushToAllDevices(title: string, body: string) {
  const tokens = await prisma.deviceToken.findMany();

  if (!ensureFirebase()) {
    logger.info("푸시 발송 (mock - Firebase 미설정)", { title, body, targetDevices: tokens.length });
    return { sent: 0, mocked: true };
  }

  if (tokens.length === 0) return { sent: 0, mocked: false };

  const response = await admin.messaging().sendEachForMulticast({
    tokens: tokens.map((t) => t.token),
    notification: { title, body },
  });

  // 만료되었거나 잘못된 토큰은 정리합니다.
  const invalidTokens = response.responses
    .map((r, i) => (r.success ? null : tokens[i].token))
    .filter((t): t is string => !!t);

  if (invalidTokens.length > 0) {
    await prisma.deviceToken.deleteMany({ where: { token: { in: invalidTokens } } });
  }

  return { sent: response.successCount, mocked: false };
}
