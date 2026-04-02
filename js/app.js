$(document).ready(function () {
    const KAKAO_JS_KEY = '226c5b7387fc287b4905522ff5fe574a';
    const COURSE_COLORS = ['#FEE500', '#4a9eff', '#ff6b6b', '#51cf66', '#cc5de8'];

    let map, ps, geocoder;
    let startMarker = null, startOverlay = null, startPlace = null;
    let waypoints = [], savedCourses = [];
    let statusTimer;

    // ─── 카카오 지도 SDK 로드 ───────────────────────────────
    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&libraries=services&autoload=false`;
    document.head.appendChild(script);
    script.onload = () => kakao.maps.load(initMap);

    // ─── 지도 초기화 ───────────────────────────────────────
    function initMap() {
      const container = document.getElementById('map');
      ps = new kakao.maps.services.Places();
      geocoder = new kakao.maps.services.Geocoder();

      const defaultPos = new kakao.maps.LatLng(37.5665, 126.9780);
      const loadMap = (pos) => {
        map = new kakao.maps.Map(container, { center: pos, level: 3 });
        addMapClickEvent();
        showStatus('지도 로드 완료');
      };

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          pos => loadMap(new kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude)),
          () => loadMap(defaultPos),
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
        );
      } else {
        loadMap(defaultPos);
      }
    }

    // ─── 지도 클릭 → 출발지/경유지 추가 ──────────────────────
    function addMapClickEvent() {
      kakao.maps.event.addListener(map, 'click', function (mouseEvent) {
        const pos = mouseEvent.latLng;
        geocoder.coord2Address(pos.getLng(), pos.getLat(), (result, status) => {
          let name = '알 수 없는 위치';
          if (status === kakao.maps.services.Status.OK) {
            const addr = result[0];
            name = addr.road_address?.building_name
              || addr.road_address?.address_name
              || addr.address?.address_name
              || name;
          }
          addPlace(pos, name);
        });
      });
    }

    // ─── 출발지/경유지 추가 공통 ─────────────────────────────
    function addPlace(pos, name) {
      if (!startPlace) {
        if (startMarker) startMarker.setMap(null);
        if (startOverlay) startOverlay.setMap(null);

        startMarker = new kakao.maps.Marker({ map, position: pos });
        startOverlay = new kakao.maps.CustomOverlay({
          content: makeOverlayContent(name, 'start'),
          position: pos,
          yAnchor: 2.5
        });
        startOverlay.setMap(map);
        startPlace = { name, pos };
        showStatus(`출발지: ${name}`);
      } else {
        if (waypoints.length >= 3) {
          showStatus('경유지는 최대 3개까지 추가할 수 있습니다');
          return;
        }
        const marker = new kakao.maps.Marker({ map, position: pos });
        const overlay = new kakao.maps.CustomOverlay({
          content: makeOverlayContent(name, 'waypoint'),
          position: pos,
          yAnchor: 2.5
        });
        overlay.setMap(map);
        waypoints.push({ marker, overlay, name, pos });
        showStatus(`경유지 ${waypoints.length}: ${name}`);
      }
      updateCourseList();
    }

    // ─── 검색 처리 ─────────────────────────────────────────
    function searchPlace(keyword) {
      if (!keyword) return showStatus('검색어를 입력하세요');
      ps.keywordSearch(keyword, (data, status) => {
        if (status === kakao.maps.services.Status.OK) {
          const place = data[0];
          const pos = new kakao.maps.LatLng(place.y, place.x);
          addPlace(pos, place.place_name);
          map.setCenter(pos);
        } else {
          showStatus('검색 결과가 없습니다');
        }
      });
    }
    $('#btn-search').on('click', () => searchPlace($('#search-input').val().trim()));
    $('#search-input').on('keypress', e => { if (e.key === 'Enter') searchPlace($('#search-input').val().trim()); });

    // ─── 현재 위치 버튼 ─────────────────────────────────────
    $('#btn-locate').on('click', () => {
      if (!map) return;
      navigator.geolocation.getCurrentPosition(pos => {
        const myPos = new kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
        geocoder.coord2Address(myPos.getLng(), myPos.getLat(), (result, status) => {
          const name = status === kakao.maps.services.Status.OK
            ? result[0].road_address?.building_name
              || result[0].road_address?.address_name
              || result[0].address?.address_name
            : '현재 위치';
          addPlace(myPos, name);
          map.setCenter(myPos);
        });
      }, () => showStatus('위치 권한을 허용해주세요'));
    });

    // ─── 초기화 ────────────────────────────────────────────
    $('#btn-reset').on('click', () => {
      if (startMarker) startMarker.setMap(null);
      if (startOverlay) startOverlay.setMap(null);
      startMarker = null; startOverlay = null; startPlace = null;

      waypoints.forEach(wp => { wp.marker.setMap(null); wp.overlay.setMap(null); });
      waypoints = [];

      savedCourses.forEach(course => course.polyline.setMap(null));
      //savedCourses = [];

      $('#search-input').val('');
      updateCourseList();
      updateSavedCoursePanel();
      showStatus('초기화되었습니다');
    });

    // ─── 코스 저장 ─────────────────────────────────────────
    $('#btn-save').on('click', async () => {
      if (!startPlace) return showStatus('출발지를 먼저 설정하세요');
      if (waypoints.length === 0) return showStatus('경유지를 1개 이상 추가하세요');

      showStatus('경로를 불러오는 중...');
      const color = COURSE_COLORS[savedCourses.length % COURSE_COLORS.length];
      const points = [startPlace.pos, ...waypoints.map(wp => wp.pos), startPlace.pos];
      const coords = points.map(p => `${p.getLng()},${p.getLat()}`).join(';');

      try {
        const res = await fetch(`https://router.project-osrm.org/route/v1/foot/${coords}?overview=full&geometries=geojson`);
        const data = await res.json();
        if (data.code !== 'Ok') return showStatus('경로를 불러오지 못했습니다');

        const routeCoords = data.routes[0].geometry.coordinates.map(([lng, lat]) => new kakao.maps.LatLng(lat, lng));
        const polyline = new kakao.maps.Polyline({
          map, path: routeCoords, strokeWeight: 5, strokeColor: color,
          strokeOpacity: 0.9, strokeStyle: 'solid'
        });

        const distanceKm = (data.routes[0].distance / 1000).toFixed(2);
        const durationMin = Math.round(data.routes[0].duration / 60);

        const course = {
          id: Date.now(),
          name: `코스 ${savedCourses.length + 1}`,
          start: startPlace.name,
          waypoints: waypoints.map(wp => wp.name),
          polyline, visible: true, distance: distanceKm, duration: durationMin, color
        };
        savedCourses.push(course);
        updateSavedCoursePanel();
        showStatus(`${course.name} 저장됨 · ${distanceKm}km`);

        // 초기화
        if (startMarker) startMarker.setMap(null);
        if (startOverlay) startOverlay.setMap(null);
        startMarker = null; startOverlay = null; startPlace = null;
        waypoints.forEach(wp => { wp.marker.setMap(null); wp.overlay.setMap(null); });
        waypoints = [];
        $('#search-input').val('');
        updateCourseList();

      } catch (e) { console.error(e); showStatus('네트워크 오류'); }
    });

    // ─── 저장 패널 업데이트 ─────────────────────────────────
    function updateSavedCoursePanel() {
      const $panel = $('#saved-courses-panel');
      const $list = $('#saved-courses-list');

      $list.empty(); // ← 항상 먼저 비우기
      if (savedCourses.length === 0) return $panel.hide();

      $panel.show();
      
      savedCourses.forEach(course => {
        $list.append(`
          <li class="saved-course-item" data-id="${course.id}">
            <div>
              <button class="saved-course-name btn-toggle-course ${course.visible ? 'on':'off'}"
                      style="background-color:${course.color}" data-id="${course.id}">${course.name}</button>
              <button class="btn-delete-course" data-id="${course.id}">−</button>
              <div class="saved-course-details">
               <span>${course.distance}km · ${course.waypoints.length}개 경유</span>
              </div>
             
            </div>
          </li>
        `);
      });
    }

    // ─── 코스 표시/숨김 ───────────────────────────────────
    $(document).on('click', '.btn-toggle-course', function () {
      const id = parseInt($(this).data('id'));
      const course = savedCourses.find(c => c.id === id);
      if (!course) return;
      course.visible = !course.visible;
      course.polyline.setMap(course.visible ? map : null);
      updateSavedCoursePanel();
    });

    // ─── 코스 삭제 ─────────────────────────────────────────
    $(document).on('click', '.btn-delete-course', function () {
      const id = parseInt($(this).data('id'));
      const idx = savedCourses.findIndex(c => c.id === id);
      if (idx === -1) return;
      savedCourses[idx].polyline.setMap(null);
      savedCourses.splice(idx, 1);
      savedCourses.forEach((c,i)=>c.name=`코스 ${i+1}`);
      updateSavedCoursePanel();
      showStatus('코스가 삭제되었습니다');
    });

    $('#btn-courses').on('click', ()=>$('#saved-courses-panel').slideToggle(200));

    // ─── 코스 목록 업데이트 ─────────────────────────────────
    function updateCourseList() {
      const $list = $('#course-list');
      $list.empty();
      if (!startPlace) return $list.append('<li>출발지를 검색하세요</li>');

      $list.append(`<li class="course-item start"><span>${startPlace.name}</span><button class="btn-remove-start">−</button></li>`);
      waypoints.forEach((wp,i)=>$list.append(`<li class="course-item waypoint"><span>${wp.name}</span><button class="btn-remove-waypoint" data-index="${i}">−</button></li>`));
    }

    // ─── 출발지/경유지 삭제 ─────────────────────────────────
    $(document).on('click', '.btn-remove-start', function () {
      if (startMarker) startMarker.setMap(null);
      if (startOverlay) startOverlay.setMap(null);
      startMarker = null; startOverlay = null; startPlace = null;

      waypoints.forEach(wp=>{ wp.marker.setMap(null); wp.overlay.setMap(null); });
      waypoints=[];

      savedCourses.forEach(c=>c.polyline.setMap(null));
      //savedCourses=[];

      $('#search-input').val('');
      updateCourseList();
      updateSavedCoursePanel();
      showStatus('출발지가 삭제되었습니다');
    });

    $(document).on('click', '.btn-remove-waypoint', function () {
      const i = parseInt($(this).data('index'));
      waypoints[i].marker.setMap(null);
      waypoints[i].overlay.setMap(null);
      waypoints.splice(i,1);
      updateCourseList();
      showStatus('경유지가 삭제되었습니다');
    });

    // ─── 오버레이 생성 ────────────────────────────────────
    function makeOverlayContent(name, type) {
      const bg = type==='start' ? '#FEE500' : '#4a9eff';
      const color = type==='start' ? '#111' : '#fff';
      return `<div style="padding:5px 10px;font-size:12px;font-weight:700;white-space:nowrap;background:${bg};border-radius:4px;color:${color}">${name}</div>`;
    }
    
    // ─── 상태 메시지 ───────────────────────────────────────
    function showStatus(msg) {
      clearTimeout(statusTimer);
      $('#status').stop(true, true).text(msg).fadeIn(200);
      statusTimer = setTimeout(() => $('#status').fadeOut(200), 2500);
    }

  });