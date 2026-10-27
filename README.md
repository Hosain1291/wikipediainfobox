# 선거 인포박스 빌더

한 번 입력한 선거 데이터를 **위키백과**와 **나무위키** 두 가지 양식의 인포박스로 바로 보여 주고, 코드와 PNG 이미지로 내보냅니다.

## 할 수 있는 것

- 선거 형태: 대통령 선거, 국회의원 선거, 지방선거, 차기 의원선거(의석표), 국민투표
- 미리보기 양식 전환
  - **위키백과**: 영어판 `Infobox election`, `Infobox referendum` 틀의 배치를 따름 (← 이전 | 선거일 | 다음 →, 후보 사진과 정당 색 띠, 제1당·제2당 머리, 선거 전/후 칸, 국민투표 ✓/✗ 결과표와 범례)
  - **나무위키**: 나무마크 표 렌더링을 따름 (테마 색 머리, 기호·정당 색 칸, 득표율 막대, 다크 모드 색 지정)
- 코드 내보내기
  - 위키백과 한국어 `{{선거 정보}}` / 영어 `{{Infobox election}}` / `{{Infobox referendum}}`
  - 나무마크 표 코드
- PNG 저장, JSON 저장·불러오기 (이전 버전 JSON도 그대로 불러옴), 예제 5종

## 위키백과 양식

- 영어판 `Template:Infobox election`, `Template:Infobox referendum` 소스 구조를 따름
- 미리보기는 한국어/English 전환: 틀이 정하는 라벨(Registered, Turnout, First party, Elected …, Results 등)이 언어에 맞게 바뀌고, 직접 입력한 내용은 그대로
- `ongoing = yes`면 왼쪽 칸이 현직(Incumbent)으로, 결과가 없으면 미정(TBD)

## 템플릿 규칙 반영

- `colourN`은 `#` 없이 넣음
- 틀은 한 줄에 3명이라, 2명씩 배치하면 1·2 / 4·5 / 7·8 칸을 사용
- 이름이 정해진 매개변수가 없는 항목은 `1blank`~`6blank` / `NdataM` 보조 행으로 출력
- 국민투표: 찬반 두 개면 `yes`/`no`/`invalid`/`total`/`turnoutpct`/`electorate`, 선택지가 셋 이상이면 `choiceN`/`percentageN` 막대 (숫자는 쉼표 없이)

## 서식

| 입력 | 결과 |
|---|---|
| `'''굵게'''`, `''기울임''` | 굵게, 기울임 |
| `*문서명*` | 링크 (`[[문서명]]`) |
| `x^{1}`, `^[a]` | 위첨자 |
| `{{increase}}` `{{decrease}}` `{{steady}}` | ▲ ▼ ▬ |
| `{{color\|#e61e2b\|빨강}}` | 색 글자 |

## 파일

- `index.html` 화면 구조
- `style.css` 앱과 두 인포박스 양식의 스타일
- `app.js` 상태, 렌더러, 코드 생성
- `presets.js` 예제 데이터
