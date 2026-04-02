# 🗺️ 산책 코스 만들기

카카오맵 기반의 나만의 산책 코스 생성 웹 앱입니다.

[![Demo](https://img.shields.io/badge/🗺️_데모_보기-live-brightgreen)](https://mina-401.github.io/RunningCourse/)
<br>
<img src="resources/readme_screenshot.png" width="400"/>

## 주요 기능
- 지도 클릭 / 장소 검색 / 현재 위치로 출발지·경유지 설정
- 최대 3개 경유지로 도보 코스 자동 생성
- 여러 코스 저장·비교·삭제

## 사용 기술
| 기술 | 용도 |
|---|---|
| Kakao Maps JavaScript API | 지도 렌더링, 장소 검색, 주소 변환 |
| OSRM | 도보 경로 계산 및 거리/소요시간 산출 |
| jQuery | DOM 조작, 이벤트 처리 |
| Ajax | OSRM API 비동기 통신 |

## OSRM 활용
[OSRM](https://project-osrm.org/) 공개 API(`router.project-osrm.org`)를  
`/route/v1/foot/` 엔드포인트로 호출해 출발지→경유지→출발지 복귀의  
도보 경로 GeoJSON을 받아 카카오맵 Polyline으로 시각화했습니다.

## 추후 개선 사항
- [ ] 실시간 운동 트래킹 기능
  - GPS 기반 실시간 거리 및 소요 시간 측정
  - 이동 속도를 기반으로 한 페이스 계산 (min/km)
  - 이동 거리와 체중을 활용한 칼로리 소모량 추정

