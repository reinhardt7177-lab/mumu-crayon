# 공개 배포

- 저장소: <https://github.com/reinhardt7177-lab/mumu-crayon>
- Cloudflare 플레이 주소: <https://mumu-crayon.reinhardt7177.workers.dev/>
- GitHub Pages 주소: <https://reinhardt7177-lab.github.io/mumu-crayon/>
- Cloudflare 방식: Workers Static Assets · `wrangler.jsonc` · `dist`만 배포
- GitHub Pages 방식: GitHub Actions → GitHub Pages
- 배포 브랜치: `main`

## 업데이트

### Cloudflare

`.github/workflows/pages.yml`의 `cloudflare` 작업은 `main` 푸시와 수동 워크플로 실행에 반응합니다. 먼저 `build` 작업이 물리·터치 입력·100스테이지 해법을 검사합니다. 성공한 동일 커밋으로 배포물을 만들고 Cloudflare에 배포한 뒤, 공개 `release.json`의 커밋과 모든 실행 파일의 SHA-256을 대조합니다.

자동 배포에는 저장소 설정의 다음 두 값이 필요합니다.

| 저장 위치 | 이름 | 내용 |
|---|---|---|
| Actions Secret | `CLOUDFLARE_API_TOKEN` | 이 게임을 배포할 수 있는 전용 Cloudflare API 토큰 |
| Actions Variable | `CLOUDFLARE_ACCOUNT_ID` | 게임이 속한 Cloudflare 계정 ID |

토큰은 소스에 기록하지 않습니다. 가능하면 무무크레용 Worker의 배포 권한으로 범위를 제한하고, 토큰 관리 권한·다른 서비스의 권한은 부여하지 않습니다. 로컬 Wrangler 로그인 토큰을 GitHub로 복사하지 않습니다. 키를 교체할 때는 같은 이름의 Actions Secret을 갱신합니다.

수동 배포도 로그인된 Wrangler CLI에서 실행할 수 있습니다.

```sh
npm run deploy:cloudflare
```

이 명령은 실행 파일을 다시 빌드하고 목록·경로·해시를 검사한 뒤 Cloudflare에 올립니다. 로컬 인증 정보는 Wrangler 인증 저장소를 사용하며 소스나 배포 파일에 넣지 않습니다.

### GitHub Pages

`main`에 올리면 `.github/workflows/pages.yml`이 물리 검증, 100스테이지 해법 재생, 정적 파일 빌드와 배포 경로 검사를 차례로 실행합니다. 검사에 실패하면 새 버전을 배포하지 않습니다.

```sh
npm test
npm run build
npm run check:site
git add .
git commit -m "Update Mumu Crayon"
git push origin main
```

Actions의 `Deploy Mumu Crayon`에서 배포 완료 여부를 확인합니다. `dist/release.json`에는 해당 배포의 커밋과 실행 파일별 SHA-256이 들어갑니다.

## 공개 범위

`.gitignore`는 공개 파일을 명시한 목록입니다. 게임에 필요한 코드·그림·글꼴, 구성 요소의 라이선스, 자동 검증 도구와 해법 입력만 추적합니다. 연구 자료, 원본 게임 에셋, 기존 시안, 개인 그림, 로컬 서버 로그, 백업과 작업 중 분석 기록은 로컬에 남깁니다.

`tools/build-site.cjs`는 `tools/site-files.cjs`에 적힌 실행 파일만 `dist`에 복사합니다. 문서, 테스트 입력과 개발 도구는 플레이 사이트에 배포하지 않습니다.

## 저장

로그인이나 별도 서버 없이 플레이합니다. 완료 기록과 스케치북은 방문자가 사용하는 브라우저의 저장 공간에 보관됩니다. 로컬 주소의 저장 기록은 공개 주소로 자동 이동하지 않습니다. 중요한 그림은 PNG로 내려받으세요.

PC에서는 마우스, 터치 기기에서는 드래그로 그릴 수 있습니다. 작은 화면에서는 가로 방향이 편리합니다. 각 스테이지의 예시 재생은 진행 기록을 채우지 않습니다.
