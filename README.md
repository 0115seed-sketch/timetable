# 천안업성고 2-9 시간표

천안업성고 2학년 9반 시간표를 조회하고, 카카오톡 공유 썸네일(OG 이미지)을 매일 자동 갱신하는 프로젝트입니다.

## 아키텍처

- 프론트엔드: GitHub Pages 정적 배포
- API 호출: 브라우저에서 NEIS API 직접 호출 (키 노출)
- OG 자동 생성: GitHub Actions 스케줄 + Python(Pillow)

## 폴더 구조

```text
.
├─ index.html
├─ assets
│  ├─ css/styles.css
│  ├─ js/config.js
│  ├─ js/app.js
│  └─ og/today_timetable.png
├─ scripts/generate_og.py
├─ .github/workflows/update-og.yml
└─ requirements.txt
```

## 1) 프론트엔드 설정

1. `assets/js/config.js`에서 API 키 설정

```js
window.__APP_CONFIG__ = {
  SCHOOL_NAME: "천안업성고 2학년 9반",
  NICE_API_KEY: "93d7e6ed85024576b50ed21a8ac017fc"
};
```

2. GitHub Pages 루트는 `main` 브랜치의 `/`로 지정

## 2) OG 이미지 자동 갱신

워크플로 파일: `.github/workflows/update-og.yml`

- 실행 시점:
  - 매일 UTC 20:00 (KST 05:00)
  - `main` 브랜치 push
- 필수 Secret:
  - GitHub Repository Secret `NICE_API_KEY`

워크플로는 `scripts/generate_og.py`를 실행해 날짜 버전 OG 이미지 파일을 생성하고,
`index.html`의 `og:image` URL을 KST 날짜 버전 파일명(`today_timetable-YYYYMMDD.png`)으로 매일 교체해 자동 커밋합니다.

## 3) 로컬 테스트

1. Python 의존성 설치

```bash
pip install -r requirements.txt
```

2. OG 이미지 생성 테스트

```bash
# PowerShell
$env:NICE_API_KEY="발급키"
python scripts/generate_og.py
```

## 확장 아이디어

- 수업 변경 하이라이트:
  전일 데이터와 비교해서 변경된 교시를 강조
- PWA 추가:
  홈 화면 설치 및 오프라인 기본 화면 제공
