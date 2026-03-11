# SCENTENCE

SCENTENCE는 향수를 중심으로 한 웹 서비스입니다. 브랜드 랜딩 페이지를 시작으로 AI 향수 추천, 아카이브형 보관함, 레이어링 기능, 향수 네트워크, 향수 위키 성격의 콘텐츠까지 하나의 제품 흐름 안에 담는 것을 목표로 합니다.

현재는 백엔드와 분리해놓은 상태입니다.

## 주요 기능

- 브랜드 중심의 랜딩 페이지와 모션 연출
- AI 향수 추천 진입 흐름
- 향수 아카이브 / 컬렉션 UI
- 향수 레이어링 기능
- 향수 네트워크 시각화
- 향수 위키형 콘텐츠 페이지
- 로그인, 회원가입, 계정 복구, 카카오 로그인
- 관리자 페이지 및 관련 UI 컴포넌트

## 기술 스택

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Framer Motion
- NextAuth
- Three.js / React Three Fiber
- Vis Network

## 로컬 실행 방법

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

실행 전에 로컬 환경 변수 파일을 준비해야 합니다.

```bash
.env
```

민감한 환경 변수는 절대 Git에 커밋하지 않습니다.

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000`으로 접속합니다.

## 사용 가능한 스크립트

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## 프로젝트 구조

```text
app/              App Router 페이지 및 라우트
components/       재사용 가능한 UI / 기능 컴포넌트
contexts/         React Context 상태 관리
lib/              유틸 함수
public/           정적 에셋
types/            타입 선언
```

## 참고 사항

- `.next/`, `node_modules/`, `.claude/`, `.env*`, `.DS_Store` 같은 로컬 전용 파일은 Git에 올리지 않습니다.
- 기능별 진행 메모와 복구용 작업 기록은 `PROJECT_NOTES.md`에 따로 정리합니다.

## 현재 상태

프로젝트 구조와 Git 상태를 정리하는 작업이 진행 중입니다. 나중에 작업을 이어서 할 경우에는 `README.md`보다 먼저 `PROJECT_NOTES.md`를 확인하는 편이 빠릅니다.
