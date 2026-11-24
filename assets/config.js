// 테스트 설정. Sandbox에서 Website 커넥터를 만든 뒤 값을 채웁니다.
window.TEST_CONFIG = {
  // Data Cloud Setup > Websites & Mobile Apps > 커넥터의 Content Delivery Network (CDN) script URL
  sdkUrl: '',
  // Web-to-Lead를 받을 org의 Id (비워 두면 폼은 Salesforce로 전송하지 않고 화면 이동만 합니다)
  webToLeadOrgId: '',
  // Sandbox는 test.salesforce.com, 운영은 webto.salesforce.com
  webToLeadHost: 'https://test.salesforce.com'
};
