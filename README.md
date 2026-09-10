# Rail Alert Backend

조건 CRUD + 모니터링 엔진(현재는 목 데이터) + FCM 푸시 발송을 담당하는 서버입니다.

## 실행 방법

```bash
npm install
cp .env.example .env
# .env에서 API_KEY를 원하는 값으로 바꿔주세요 (앱과 동일한 값을 써야 합니다)

npx prisma migrate dev --name init   # DB 테이블 생성
npm run dev                           # http://localhost:4000 에서 실행
```

서버가 뜨면 30초(기본값)마다 활성화된 조건들을 MockSeatProvider가 확률적으로
"좌석 발생"으로 판정하면서 알림 파이프라인 전체(알림 생성 → 푸시 발송)가
동작하는 걸 콘솔 로그로 확인할 수 있습니다.

## API 목록

| Method | Path | 설명 |
|---|---|---|
| GET | /conditions | 조건 목록 조회 |
| POST | /conditions | 조건 등록 |
| PATCH | /conditions/:id | isActive 등 수정 |
| DELETE | /conditions/:id | 조건 삭제 |
| GET | /conditions/:id/alerts | 특정 조건의 알림 히스토리 |
| POST | /device-tokens | 앱의 FCM 토큰 등록 |
| DELETE | /device-tokens/:token | 토큰 삭제 |

모든 요청에 헤더 `x-api-key: <.env의 API_KEY 값>` 이 필요합니다.

## 실제 푸시(FCM)를 받으려면

1. Firebase 콘솔에서 프로젝트 생성 → 프로젝트 설정 → 서비스 계정 → "새 비공개 키 생성"으로 JSON 다운로드
2. 그 파일 경로를 `.env`의 `FIREBASE_SERVICE_ACCOUNT_PATH`에 지정
3. 앱 쪽(rail-alert-app)에도 같은 Firebase 프로젝트의 `google-services.json`을 넣고
   `expo-notifications`가 발급하는 토큰 대신 FCM 토큰을 받아 `/device-tokens`로 등록하도록
   연동해야 합니다 (다음 단계에서 진행 예정)

설정을 안 해도 서버는 정상 동작하며, 이 경우 실제 푸시 대신 콘솔에 로그만 남깁니다.

## 로그 확인

모든 요청/에러/모니터링 결과가 `logs/app-YYYY-MM-DD.log`에 JSON 라인 형태로 쌓입니다.
문제가 생기면 이 파일을 열어보거나, 서버가 켜진 상태에서:

```bash
curl http://localhost:4000/logs/recent -H "x-api-key: <API_KEY>"
```

로 최근 200줄을 바로 확인할 수 있습니다. `uncaughtException`, `unhandledRejection`도
전부 여기 기록되므로 서버가 예상치 못하게 멈췄을 때도 원인을 추적할 수 있어요.

## 실제 코레일/SRT 연동 자리

`src/services/monitor/mockProvider.ts` 대신 `SeatProvider` 인터페이스
(`src/services/monitor/types.ts`)를 구현하는 새 클래스를 만들어서
`src/index.ts`의 `new MockSeatProvider(...)` 부분을 교체하면 됩니다.

다만 이전에 말씀드렸듯, 이 부분은 코레일/SRT의 이용약관 및 매크로 관련 법 규정을
직접 확인하신 뒤 진행하시는 걸 권해요 — 여기서는 인터페이스와 파이프라인까지만
준비해뒀습니다.
