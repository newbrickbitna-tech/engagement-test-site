// Data Cloud Web SDK(Salesforce Interactions SDK) 연동 테스트용 스크립트.
// 이벤트 필드명은 Website 커넥터에 올린 스키마와 맞아야 합니다. 커넥터 생성 후 맞춰서 조정합니다.
(function () {
  var cfg = window.TEST_CONFIG || {};
  var log = function (msg, data) {
    var el = document.getElementById('track-log');
    if (el) el.textContent += '[' + new Date().toLocaleTimeString() + '] ' + msg + (data ? ' ' + JSON.stringify(data) : '') + '\n';
  };
  window.TestTracking = { ready: false, identify: function () { return Promise.resolve(); } };

  if (!cfg.sdkUrl) { log('SDK URL이 비어 있어 추적하지 않습니다 (assets/config.js).'); return; }

  var s = document.createElement('script');
  s.src = cfg.sdkUrl;
  s.onload = function () {
    var SI = window.SalesforceInteractions;
    if (!SI) { log('SDK를 불러왔지만 SalesforceInteractions 객체가 없습니다.'); return; }
    SI.init({
      consents: [{ provider: 'Test Site', purpose: SI.ConsentPurpose.Tracking, status: SI.ConsentStatus.OptIn }]
    }).then(function () {
      SI.initSitemap({
        global: {},
        pageTypes: [{
          name: document.body.getAttribute('data-page') || 'default',
          isMatch: function () { return true; },
          interaction: { name: 'page-view', eventType: 'pageView', pageUrl: location.href, pageTitle: document.title }
        }]
      });
      window.TestTracking.ready = true;
      log('SDK 초기화 완료, page view 전송:', { page: document.body.getAttribute('data-page') });
    }).catch(function (e) { log('SDK 초기화 실패: ' + e); });

    // 폼 제출 시 이메일을 identity 이벤트로 보내 익명 방문 기록을 사람과 연결합니다.
    window.TestTracking.identify = function (p) {
      log('identity + form-submit 전송:', { email: p.email });
      return Promise.resolve(SI.sendEvent({
        interaction: { name: 'form-submit', eventType: 'formSubmit', formName: 'contact' },
        user: { attributes: { eventType: 'identity', isAnonymous: 0, email: p.email, firstName: p.firstName, lastName: p.lastName } }
      }));
    };
  };
  s.onerror = function () { log('SDK 스크립트를 불러오지 못했습니다: ' + cfg.sdkUrl); };
  document.head.appendChild(s);
})();
