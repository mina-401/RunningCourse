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

  let map, ps, marker;

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

  function moveToLocation(pos, message) {
    console.log("moveToLocation 호출됨", pos);

    if (!map) {
      console.log("❌ map 없음");
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



  $('#btn-search').on('click', doSearch);
  $('#search-input').on('keypress', e => { if (e.key === 'Enter') doSearch(); });

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

  $('#btn-locate').on('click', () => {
    navigator.geolocation.getCurrentPosition(pos => {
      const myPos = new kakao.maps.LatLng(
        pos.coords.latitude,
        pos.coords.longitude
      );

      moveToLocation(myPos, '현재 위치로 이동했습니다');
    });
  });

  let statusTimer;
  function showStatus(msg) {
    clearTimeout(statusTimer);
    $('#status').text(msg).addClass('show');
    statusTimer = setTimeout(() => $('#status').removeClass('show'), 2500);
  }

});