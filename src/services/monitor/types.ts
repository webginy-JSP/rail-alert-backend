import { WatchCondition } from "@prisma/client";

// 하나의 감시 조건에 대해 "지금 예매 가능한 좌석이 있는가"를 확인하는 역할입니다.
// 실제 코레일/SRT 연동은 이 인터페이스를 구현하는 새 클래스를 만들어서
// engine.ts에서 provider만 교체하면 됩니다. (구체적인 조회 스펙은 별도로 확인 필요)
export interface SeatProvider {
  checkAvailability(condition: WatchCondition): Promise<{
    available: boolean;
    detail?: string; // 예: "10:30 KTX 101호 일반실 3석"
  }>;
}
