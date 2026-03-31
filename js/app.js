$(document).ready(function () {

  const KAKAO_JS_KEY = '226c5b7387fc287b4905522ff5fe574a';

  const script = document.createElement('script');
  script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&libraries=services&autoload=false`;

  document.head.appendChild(script);

  console.log("여기까지 옴");

  script.onload = function() {
    console.log("카카오 SDK 로드 완료");
    if (kakao && kakao.maps) {
        kakao.maps.load(function() {
        console.log("kakao.maps.load 호출됨");
        initMap();
      });
    } else {
      console.log(" kakao 객체 없음");
    }
  };


  // 경유지 정보 저장용 배열과 지오코더 변수
  let waypoints = [];
  let geocoder; // 추가

  function addMapClickEvent() {
    geocoder = new kakao.maps.services.Geocoder(); // 추가

    kakao.maps.event.addListener(map, 'click', function(mouseEvent) {
      const pos = mouseEvent.latLng;

      // 좌표 → 주소 변환
      geocoder.coord2Address(pos.getLng(), pos.getLat(), function(result, status) {
        let placeName = '알 수 없는 위치';

        if (status === kakao.maps.services.Status.OK) {
          const addr = result[0];
          // 도로명 있으면 도로명, 없으면 지번
          placeName = addr.road_address
            ? addr.road_address.building_name || addr.road_address.address_name
            : addr.address.address_name;
        }

        // 마커 생성
        const waypointMarker = new kakao.maps.Marker({
          map: map,
          position: pos
        });

        // 말풍선 인포윈도우
        const infoWindow = new kakao.maps.InfoWindow({
          content: `<div style="padding:6px 10px;font-size:12px;font-weight:700;white-space:nowrap;">📍 ${placeName}</div>`
        });
        infoWindow.open(map, waypointMarker);

        waypoints.push({ marker: waypointMarker, infoWindow, name: placeName });
        showStatus(`경유지 ${waypoints.length}: ${placeName}`);
      });
    });
  }


  // 초기화 함수
  let map, ps, marker;

  // 지도 초기화 및 현재 위치 표시
 function initMap() {
  console.log("initMap 실행됨");

  const container = document.getElementById('map');
  ps = new kakao.maps.services.Places();

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function (position) {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const myPos = new kakao.maps.LatLng(lat, lng);

        // 위치 확인 후 그 위치로 지도 생성
        map = new kakao.maps.Map(container, {
          center: myPos,
          level: 3
        });

        addMapClickEvent();

        marker = new kakao.maps.Marker({
          map: map,
          position: myPos
        });

        showStatus('현재 위치로 지도를 로드했습니다');
      },
      function (error) {
        console.log("geolocation 에러:", error.code);

        // 권한 거부 시 서울로 폴백
        const defaultPos = new kakao.maps.LatLng(37.5665, 126.9780);
        map = new kakao.maps.Map(container, {
          center: defaultPos,
          level: 5
        });
        
        addMapClickEvent();

        showStatus('위치 권한이 없어 기본 위치로 로드됩니다');
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 0
      }


       
    );
  } else {
    // geolocation 미지원 브라우저 폴백
    const defaultPos = new kakao.maps.LatLng(37.5665, 126.9780);
    map = new kakao.maps.Map(container, {
      center: defaultPos,
      level: 5
    });
  }
}

// 위치 이동 함수
  function moveToLocation(pos, message) {
    console.log("moveToLocation 호출됨", pos);

    if (!map) {
      console.log("map 없음");
      return;
    }

    if (marker) marker.setMap(null);

    marker = new kakao.maps.Marker({
      map: map,
      position: pos
    });

    map.setCenter(pos);
    map.setLevel(3);

    showStatus(message);
  }


// 검색 기능
  $('#btn-search').on('click', doSearch);
  $('#search-input').on('keypress', e => { if (e.key === 'Enter') doSearch(); });

  // 장소 검색 함수
  function doSearch() {
    const keyword = $('#search-input').val().trim();
    if (!keyword) return;

    ps.keywordSearch(keyword, (data, status) => {
      if (status === kakao.maps.services.Status.OK) {
        const place = data[0];
        const pos = new kakao.maps.LatLng(place.y, place.x);

        if (marker) marker.setMap(null);

        marker = new kakao.maps.Marker({ map, position: pos });
        map.setCenter(pos);
        map.setLevel(3);

        const infoWindow = new kakao.maps.InfoWindow({
          content: `<div style="padding:8px 12px;font-size:13px;font-weight:700;">${place.place_name}</div>`
        });

        infoWindow.open(map, marker);
        showStatus(place.place_name);
      } else {
        showStatus('검색 결과가 없습니다');
      }
    });
  }

  // 현재 위치로 이동 버튼
  $('#btn-locate').on('click', () => {
    navigator.geolocation.getCurrentPosition(pos => {
      const myPos = new kakao.maps.LatLng(
        pos.coords.latitude,
        pos.coords.longitude
      );

      moveToLocation(myPos, '현재 위치로 이동했습니다');
    });
  });

  // 상태 메시지 표시 함수
  let statusTimer;
  function showStatus(msg) {
    clearTimeout(statusTimer);
    $('#status').text(msg).addClass('show');
    statusTimer = setTimeout(() => $('#status').removeClass('show'), 2500);
  }

});