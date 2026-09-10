import { WatchCondition } from "@prisma/client";
import { SeatProvider } from "./types";

// 실제 외부 시스템 없이, 확률적으로 "좌석 발생"을 시뮬레이션합니다.
// 백엔드 파이프라인(조회 → 알림 생성 → 푸시 발송)이 제대로 도는지
// 확인할 때 씁니다. 실서비스에서는 이 클래스를 진짜 조회 로직으로 교체하세요.
export class MockSeatProvider implements SeatProvider {
  constructor(private readonly hitRate = 0.1) {}

  async checkAvailability(condition: WatchCondition) {
    const available = Math.random() < this.hitRate;
    return {
      available,
      detail: available
        ? `${condition.timeFrom}~${condition.timeTo} 사이 ${condition.trainType} ${condition.seatClass} (테스트 데이터)`
        : undefined,
    };
  }
}
