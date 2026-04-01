$(document).ready(function () {

  const KAKAO_JS_KEY = '226c5b7387fc287b4905522ff5fe574a';

  const script = document.createElement('script');
  script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&libraries=services&autoload=false`;
  document.head.appendChild(script);

  script.onload = function () {
    if (kakao && kakao.maps) {
      kakao.maps.load(function () {
        initMap();
      });
    }
  };

  let map, ps, geocoder;
  let startMarker = null;
  let startOverlay = null;
  let startPlace = null;
  let waypoints = [];
  let savedCourses = [];

  const COURSE_COLORS = ['#FEE500', '#4a9eff', '#ff6b6b', '#51cf66', '#cc5de8'];

  // ─── 지도 초기화 ───────────────────────────────────────────
  function initMap() {
    const container = document.getElementById('map');
    ps = new kakao.maps.services.Places();
    geocoder = new kakao.maps.services.Geocoder();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        function (position) {
          const myPos = new kakao.maps.LatLng(
            position.coords.latitude,
            position.coords.longitude
          );
          map = new kakao.maps.Map(container, { center: myPos, level: 3 });
          addMapClickEvent();
          showStatus('현재 위치로 지도를 로드했습니다');
        },
        function () {
          const defaultPos = new kakao.maps.LatLng(37.5665, 126.9780);
          map = new kakao.maps.Map(container, { center: defaultPos, level: 5 });
          addMapClickEvent();
          showStatus('기본 위치로 로드됩니다');
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
      );
    } else {
      const defaultPos = new kakao.maps.LatLng(37.5665, 126.9780);
      map = new kakao.maps.Map(container, { center: defaultPos, level: 5 });
      addMapClickEvent();
    }
  }

  // ─── 지도 클릭 → 출발지 or 경유지 추가 ───────────────────
  function addMapClickEvent() {
    kakao.maps.event.addListener(map, 'click', function (mouseEvent) {
      const pos = mouseEvent.latLng;

      geocoder.coord2Address(pos.getLng(), pos.getLat(), function (result, status) {
        let placeName = '알 수 없는 위치';

        if (status === kakao.maps.services.Status.OK) {
          const addr = result[0];
          if (addr.road_address && addr.road_address.building_name) {
            placeName = addr.road_address.building_name;
          } else if (addr.road_address) {
            placeName = addr.road_address.address_name;
          } else {
            placeName = addr.address.address_name;
          }
        }

        if (!startPlace) {
          if (startMarker) startMarker.setMap(null);
          if (startOverlay) startOverlay.setMap(null);

          startMarker = new kakao.maps.Marker({ map, position: pos });
          startOverlay = new kakao.maps.CustomOverlay({
            content: makeOverlayContent(placeName, 'start'),
            position: pos,
            yAnchor: 2.5
          });
          startOverlay.setMap(map);
          startPlace = { name: placeName, pos };

          updateCourseList();
          showStatus(`출발지: ${placeName}`);
          return;
        }

        if (waypoints.length >= 3) {
          showStatus('경유지는 최대 3개까지 추가할 수 있습니다');
          return;
        }

        const waypointMarker = new kakao.maps.Marker({ map, position: pos });
        const overlay = new kakao.maps.CustomOverlay({
          content: makeOverlayContent(placeName, 'waypoint'),
          position: pos,
          yAnchor: 2.5
        });
        overlay.setMap(map);

        waypoints.push({ marker: waypointMarker, overlay, name: placeName, pos });
        updateCourseList();
        showStatus(`경유지 ${waypoints.length}: ${placeName}`);
      });
    });
  }

  // ─── 출발지 검색 ───────────────────────────────────────────
  $('#btn-search').on('click', doSearch);
  $('#search-input').on('keypress', e => { if (e.key === 'Enter') doSearch(); });

  function doSearch() {
    const keyword = $('#search-input').val().trim();
    if (!keyword) return;
    if (!map) { showStatus('지도가 아직 로드되지 않았습니다'); return; }

    ps.keywordSearch(keyword, (data, status) => {
      if (status === kakao.maps.services.Status.OK) {
        const place = data[0];
        const pos = new kakao.maps.LatLng(place.y, place.x);

        if (startMarker) startMarker.setMap(null);
        if (startOverlay) startOverlay.setMap(null);

        startMarker = new kakao.maps.Marker({ map, position: pos });
        startOverlay = new kakao.maps.CustomOverlay({
          content: makeOverlayContent(place.place_name, 'start'),
          position: pos,
          yAnchor: 2.5
        });
        startOverlay.setMap(map);

        startPlace = { name: place.place_name, pos };
        map.setCenter(pos);
        map.setLevel(3);

        updateCourseList();
        showStatus(`출발지: ${place.place_name}`);
      } else {
        showStatus('검색 결과가 없습니다');
      }
    });
  }

  // ─── 현재 위치 버튼 ────────────────────────────────────────
  $('#btn-locate').on('click', () => {
    if (!map) return;
    navigator.geolocation.getCurrentPosition(
      pos => {
        const myPos = new kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude);

        if (!startPlace) {
          geocoder.coord2Address(myPos.getLng(), myPos.getLat(), function (result, status) {
            let placeName = '현재 위치';

            if (status === kakao.maps.services.Status.OK) {
              const addr = result[0];
              if (addr.road_address && addr.road_address.building_name) {
                placeName = addr.road_address.building_name;
              } else if (addr.road_address) {
                placeName = addr.road_address.address_name;
              } else {
                placeName = addr.address.address_name;
              }
            }

            if (startMarker) startMarker.setMap(null);
            if (startOverlay) startOverlay.setMap(null);

            startMarker = new kakao.maps.Marker({ map, position: myPos });
            startOverlay = new kakao.maps.CustomOverlay({
              content: makeOverlayContent(placeName, 'start'),
              position: myPos,
              yAnchor: 2.5
            });
            startOverlay.setMap(map);
            startPlace = { name: placeName, pos: myPos };

            map.setCenter(myPos);
            map.setLevel(3);
            updateCourseList();
            showStatus(`출발지: ${placeName}`);
          });
          return;
        }

        map.setCenter(myPos);
        map.setLevel(3);
        showStatus('현재 위치로 이동했습니다');
      },
      () => showStatus('위치 권한을 허용해주세요')
    );
  });

  // ─── 초기화 버튼 ───────────────────────────────────────────
  $('#btn-reset').on('click', () => {
    if (startMarker) startMarker.setMap(null);
    if (startOverlay) startOverlay.setMap(null);
    startMarker = null;
    startOverlay = null;
    startPlace = null;

    waypoints.forEach(wp => {
      wp.marker.setMap(null);
      wp.overlay.setMap(null);
    });
    waypoints = [];

    savedCourses.forEach(course => course.polyline.setMap(null));
    savedCourses = [];

    $('#search-input').val('');
    updateCourseList();
    updateSavedCoursePanel();
    showStatus('초기화되었습니다');
  });

  // ─── 코스 저장 버튼 ────────────────────────────────────────
  $('#btn-save').on('click', async () => {
    if (!startPlace) { showStatus('출발지를 먼저 설정하세요'); return; }
    if (waypoints.length === 0) { showStatus('경유지를 1개 이상 추가하세요'); return; }

    showStatus('경로를 불러오는 중...');

    // 색상은 현재 저장된 코스 수 기준으로 순환
    const color = COURSE_COLORS[savedCourses.length % COURSE_COLORS.length];

    const points = [
      startPlace.pos,
      ...waypoints.map(wp => wp.pos),
      startPlace.pos
    ];

    const coords = points
      .map(p => `${p.getLng()},${p.getLat()}`)
      .join(';');

    try {
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/foot/${coords}?overview=full&geometries=geojson`
      );
      const data = await res.json();

      if (data.code !== 'Ok') {
        showStatus('경로를 불러오지 못했습니다');
        return;
      }

      const routeCoords = data.routes[0].geometry.coordinates.map(
        ([lng, lat]) => new kakao.maps.LatLng(lat, lng)
      );

      const polyline = new kakao.maps.Polyline({
        map: map,
        path: routeCoords,
        strokeWeight: 5,
        strokeColor: color,
        strokeOpacity: 0.9,
        strokeStyle: 'solid'
      });

      const distanceKm = (data.routes[0].distance / 1000).toFixed(2);
      const durationMin = Math.round(data.routes[0].duration / 60);

      const course = {
        id: Date.now(),
        name: `코스 ${savedCourses.length + 1}`,
        start: startPlace.name,
        waypoints: waypoints.map(wp => wp.name),
        polyline,
        visible: true,
        distance: distanceKm,
        duration: durationMin,
        color
      };

      savedCourses.push(course);
      updateSavedCoursePanel();
      showStatus(`${course.name} 저장됨 · ${distanceKm}km`);

      // 저장 후 출발지/경유지 마커 초기화 (다음 코스 설정 위해)
      if (startMarker) startMarker.setMap(null);
      if (startOverlay) startOverlay.setMap(null);
      startMarker = null;
      startOverlay = null;
      startPlace = null;

      waypoints.forEach(wp => {
        wp.marker.setMap(null);
        wp.overlay.setMap(null);
      });
      waypoints = [];

      $('#search-input').val('');
      updateCourseList();

    } catch (e) {
      console.error(e);
      showStatus('네트워크 오류가 발생했습니다');
    }
  });

  // ─── 저장된 코스 패널 업데이트 ────────────────────────────
  function updateSavedCoursePanel() {
    const $panel = $('#saved-courses-panel');

    if (savedCourses.length === 0) {
      $panel.hide();
      return;
    }

    $panel.show();
    const $list = $('#saved-courses-list');
    $list.empty();

    savedCourses.forEach(course => {
      $list.append(`
        <li class="saved-course-item" data-id="${course.id}">
          <div class="saved-course-info">
            <div class="saved-course-header">
              <div class="left">
               
                <button 
                  class="saved-course-name btn-toggle-course ${course.visible ? 'on' : 'off'}"
                  style="background-color: ${course.color};"
                  data-id="${course.id}">
                  ${course.name}
                </button>
              </div>
              <button class="btn-delete-course" data-id="${course.id}">−</button>
            </div>
            <span class="saved-course-detail">
              ${course.distance}km · ${course.duration}분 · ${course.waypoints.length}개 경유
            </span>
          </div>
        </li>
      `);
    });
  }

  // ─── 코스 표시/숨김 토글 ──────────────────────────────────
  $(document).on('click', '.btn-toggle-course', function () {
    const id = parseInt($(this).data('id'));
    const course = savedCourses.find(c => c.id === id);
    if (!course) return;

    course.visible = !course.visible;
    course.polyline.setMap(course.visible ? map : null);
    updateSavedCoursePanel();
  });

  // ─── 코스 삭제 ─────────────────────────────────────────────
  $(document).on('click', '.btn-delete-course', function () {
    const id = parseInt($(this).data('id'));
    const idx = savedCourses.findIndex(c => c.id === id);
    if (idx === -1) return;

    savedCourses[idx].polyline.setMap(null);
    savedCourses.splice(idx, 1);

    // 코스 이름 재번호
    savedCourses.forEach((c, i) => { c.name = `코스 ${i + 1}`; });

    updateSavedCoursePanel();
    showStatus('코스가 삭제되었습니다');
  });

  // ─── 저장된 코스 패널 토글 버튼 ───────────────────────────
  $('#btn-courses').on('click', () => {
    $('#saved-courses-panel').slideToggle(200);
  });

  // ─── 패널 코스 목록 업데이트 ───────────────────────────────
  function updateCourseList() {
    const $list = $('#course-list');
    $list.empty();

    if (!startPlace) {
      $list.append('<li class="course-item empty">출발지를 검색하세요</li>');
      return;
    }

    $list.append(`
      <li class="course-item start">
        <span>${startPlace.name}</span>
        <button class="btn-remove-start">−</button>
      </li>
    `);

    waypoints.forEach((wp, i) => {
      $list.append(`
        <li class="course-item waypoint" data-index="${i}">
          <span>${wp.name}</span>
          <button class="btn-remove-waypoint" data-index="${i}">−</button>
        </li>
      `);
    });
  }

  // ─── 출발지 취소 ───────────────────────────────────────────
  $(document).on('click', '.btn-remove-start', function () {
    if (startMarker) startMarker.setMap(null);
    if (startOverlay) startOverlay.setMap(null);
    startMarker = null;
    startOverlay = null;
    startPlace = null;

    waypoints.forEach(wp => {
      wp.marker.setMap(null);
      wp.overlay.setMap(null);
    });
    waypoints = [];

    savedCourses.forEach(course => course.polyline.setMap(null));
    savedCourses = [];

    $('#search-input').val('');
    updateCourseList();
    updateSavedCoursePanel();
    showStatus('출발지가 삭제되었습니다');
  });

  // ─── 경유지 취소 ───────────────────────────────────────────
  $(document).on('click', '.btn-remove-waypoint', function () {
    const i = parseInt($(this).data('index'));
    waypoints[i].marker.setMap(null);
    waypoints[i].overlay.setMap(null);
    waypoints.splice(i, 1);
    updateCourseList();
    showStatus('경유지가 삭제되었습니다');
  });

  // ─── 오버레이 HTML 생성 ────────────────────────────────────
  function makeOverlayContent(name, type) {
    const bg = type === 'start' ? '#FEE500' : '#4a9eff';
    const color = type === 'start' ? '#111' : '#fff';
    return `<div style="padding:5px 10px;font-size:12px;font-weight:700;white-space:nowrap;background:${bg};border-radius:4px;font-family:sans-serif;color:${color};">${name}</div>`;
  }

  // ─── 상태 메시지 ───────────────────────────────────────────
  let statusTimer;
  function showStatus(msg) {
    clearTimeout(statusTimer);
    $('#status').text(msg).addClass('show');
    statusTimer = setTimeout(() => $('#status').removeClass('show'), 2500);
  }

});