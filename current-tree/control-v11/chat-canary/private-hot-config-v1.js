(function installPrometeoPrimaryHotConfigV1(global){
  'use strict';
  global.PROMETEO_PRIMARY_HOT_CONFIG_V1 = Object.freeze({
    schema: 'prometeo.primary-hot-public-config/v1',
    enabled: false,
    endpoint: null,
    authority: 'TRANSPORT_CONFIG_ONLY',
    note: 'Prepared switch. Enable only after a fresh minimal private HOT project passes deployment and health checks.'
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
