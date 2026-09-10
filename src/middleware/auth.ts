import { Request, Response, NextFunction } from "express";

export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.API_KEY;

  // API_KEY를 설정하지 않았으면 로컬 테스트용으로 통과시킵니다.
  // 실제 폰에서 쓰려면 반드시 .env에 API_KEY를 설정하세요.
  if (!expected) return next();

  const provided = req.header("x-api-key");
  if (provided !== expected) {
    return res.status(401).json({ error: "invalid api key" });
  }
  next();
}
