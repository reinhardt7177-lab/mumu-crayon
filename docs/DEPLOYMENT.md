# 공개 배포

- 저장소: <https://github.com/reinhardt7177-lab/mumu-crayon>
- 플레이 주소: <https://reinhardt7177-lab.github.io/mumu-crayon/>
- 방식: GitHub Actions → GitHub Pages
- 배포 브랜치: `main`

## 업데이트

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
