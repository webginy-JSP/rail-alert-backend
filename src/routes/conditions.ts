import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";

export const conditionsRouter = Router();

const conditionSchema = z.object({
  departure: z.string().min(1),
  arrival: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeFrom: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  timeTo: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  trainType: z.enum(["KTX", "SRT", "무궁화", "ITX-새마을"]),
  seatClass: z.enum(["일반실", "특실"]),
});

// GET /conditions - 전체 조건 목록
conditionsRouter.get("/", async (_req, res) => {
  const list = await prisma.watchCondition.findMany({
    orderBy: { createdAt: "desc" },
  });
  res.json(list);
});

// POST /conditions - 새 조건 등록
conditionsRouter.post("/", async (req, res) => {
  const parsed = conditionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const created = await prisma.watchCondition.create({ data: parsed.data });
  res.status(201).json(created);
});

// PATCH /conditions/:id - 활성/비활성 토글 등 부분 수정
conditionsRouter.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const patchSchema = z.object({ isActive: z.boolean() }).partial();
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  try {
    const updated = await prisma.watchCondition.update({
      where: { id },
      data: parsed.data,
    });
    res.json(updated);
  } catch {
    res.status(404).json({ error: "condition not found" });
  }
});

// DELETE /conditions/:id
conditionsRouter.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.watchCondition.delete({ where: { id } });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: "condition not found" });
  }
});

// GET /conditions/:id/alerts - 특정 조건의 알림 히스토리
conditionsRouter.get("/:id/alerts", async (req, res) => {
  const { id } = req.params;
  const alerts = await prisma.alert.findMany({
    where: { conditionId: id },
    orderBy: { createdAt: "desc" },
  });
  res.json(alerts);
});
