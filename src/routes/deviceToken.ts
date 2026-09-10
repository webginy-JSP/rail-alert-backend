import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";

export const deviceTokenRouter = Router();

const tokenSchema = z.object({
  token: z.string().min(10),
  platform: z.enum(["android", "ios"]).default("android"),
});

// POST /device-tokens - 앱이 발급받은 FCM 토큰을 서버에 등록
// (앱을 처음 실행하거나 토큰이 갱신될 때마다 호출)
deviceTokenRouter.post("/", async (req, res) => {
  const parsed = tokenSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const saved = await prisma.deviceToken.upsert({
    where: { token: parsed.data.token },
    update: {},
    create: parsed.data,
  });
  res.status(201).json(saved);
});

deviceTokenRouter.delete("/:token", async (req, res) => {
  try {
    await prisma.deviceToken.delete({ where: { token: req.params.token } });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: "token not found" });
  }
});
