// Data Cloud Web SDK(Salesforce Interactions SDK) 연동 테스트용 스크립트.
// page view마다 UTM 5개를 함께 보내고, 폼 제출 시 이메일을 identity로 보내 방문 기록을 사람과 연결합니다.
(function () {
  var cfg = window.TEST_CONFIG || {};
  var KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  var STORE = 'ets:utm';
  var log = function (msg, data) {
    var el = document.getElementById('track-log');
    if (el) el.textContent += '[' + new Date().toLocaleTimeString() + '] ' + msg + (data ? ' ' + JSON.stringify(data) : '') + '\n';
  };

  // URL에 UTM이 있으면 저장(덮어쓰기), 없으면 저장된 값을 사용
  function utm() {
    var p = new URLSearchParams(location.search), v = {};
    if (KEYS.some(function (k) { return p.has(k); })) {
      KEYS.forEach(function (k) { v[k] = p.get(k) || ''; });
      try { localStorage.setItem(STORE, JSON.stringify(v)); } catch (e) {}
    } else {
      try { v = JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { v = {}; }
    }
    return { utmSource: v.utm_source || '', utmMedium: v.utm_medium || '', utmCampaign: v.utm_campaign || '',
             utmContent: v.utm_content || '', utmTerm: v.utm_term || '' };
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
      log('page view 전송:', { page: page, utmContent: current.utmContent, deviceId: SI.getAnonymousId && SI.getAnonymousId() });
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
