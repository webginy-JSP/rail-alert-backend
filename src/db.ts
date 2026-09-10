import { PrismaClient } from "@prisma/client";

// 개발 중 핫리로드 시 커넥션이 여러 개 생기는 것을 방지하기 위한 싱글톤 패턴입니다.
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma = global.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}
