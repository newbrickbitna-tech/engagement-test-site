// Data Cloud Web SDK(Salesforce Interactions SDK) 연동 테스트용 스크립트.
// page view·form submit마다 최초 UTM 5개(utmSource 등)와 최근 UTM 5개(utmSourceLast 등)를 함께 보내고, 폼 제출 시 이메일을 identity로 보내 방문 기록을 사람과 연결합니다.
(function () {
  var cfg = window.TEST_CONFIG || {};
  var KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  var NAMES = ['Source', 'Medium', 'Campaign', 'Content', 'Term'];
  var log = function (msg, data) {
    var el = document.getElementById('track-log');
    if (el) el.textContent += '[' + new Date().toLocaleTimeString() + '] ' + msg + (data ? ' ' + JSON.stringify(data) : '') + '\n';
  };

  // 홈페이지 lead-attribution.js와 같은 저장 구조(mr:lead-utm = { first: {expiresAt, values}, last: {expiresAt, values} })를 읽음
  // Lead 필드 규칙과 같게 전송: 접미어 없음 = 최초, Last = 최근 (Salesforce에서 utm_source__c·utm_source_last__c 등에 저장)
  // - utmSource 등 5개     : 최초 유입(first) 값 (없으면 URL 값)
  // - utmSourceLast 등 5개 : URL에 UTM이 있으면 URL 값, 없으면 최근 유입(last) 값
  function utm() {
    var params = new URLSearchParams(location.search), first = {}, last = {};
    try {
      var s = JSON.parse(localStorage.getItem('mr:lead-utm')) || {}, now = Date.now();
      if (s.values && !s.last) s = { last: s };   // 예전 단일 구조 호환
      if (s.first && s.first.expiresAt > now) first = s.first.values || {};
      if (s.last && s.last.expiresAt > now) last = s.last.values || {};
    } catch (e) {}
    var fromUrl = KEYS.some(function (k) { return params.has(k); });
    var hasFirst = KEYS.some(function (k) { return first[k]; });
    var out = {};
    KEYS.forEach(function (k, i) {
      out['utm' + NAMES[i]] = (hasFirst ? first[k] : (fromUrl ? params.get(k) : '')) || '';
      out['utm' + NAMES[i] + 'Last'] = (fromUrl ? params.get(k) : last[k]) || '';
    });
    return out;
  }
  var current = utm();
  window.TestTracking = { ready: false, utm: current, identify: function () { return Promise.resolve(); } };

  if (!cfg.sdkUrl) { log('SDK URL이 비어 있어 추적하지 않습니다 (assets/config.js).'); return; }

  var s = document.createElement('script');
  s.src = cfg.sdkUrl;
  s.onload = function () {
    var SI = window.SalesforceInteractions;
    if (!SI) { log('SDK를 불러왔지만 SalesforceInteractions 객체가 없습니다.'); return; }
    var page = document.body.getAttribute('data-page') || 'default';
    SI.init({
      consents: [{ provider: 'Test Site', purpose: SI.ConsentPurpose.Tracking, status: SI.ConsentStatus.OptIn }]
    }).then(function () {
      var ev = { interaction: Object.assign({ name: 'page-view', eventType: 'pageView',
                 pageUrl: location.href, pageTitle: document.title, pageName: page }, current) };
      SI.sendEvent(ev);
      window.TestTracking.ready = true;
      log('page view 전송:', { page: page, utm: current, deviceId: SI.getAnonymousId && SI.getAnonymousId() });
    }).catch(function (e) { log('SDK 초기화 실패: ' + e); });

    window.TestTracking.identify = function (p) {
      log('form-submit + identity + contactPointEmail 전송:', { email: p.email });
      SI.sendEvent({ interaction: Object.assign({ name: 'form-submit', eventType: 'formSubmit',
                     formName: 'contact', pageUrl: location.href }, current) });
      SI.sendEvent({ user: { attributes: { eventType: 'identity', isAnonymous: '0', firstName: p.firstName, lastName: p.lastName } } });
      SI.sendEvent({ user: { attributes: { eventType: 'contactPointEmail', email: p.email } } });
      return new Promise(function (r) { setTimeout(r, 1200); });
    };
  };
  s.onerror = function () { log('SDK 스크립트를 불러오지 못했습니다: ' + cfg.sdkUrl); };
  document.head.appendChild(s);
})();
