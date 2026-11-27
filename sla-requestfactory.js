//TODO: read appCode from main module

var slaRequestFactory = (function () {
	
	function buildPingRequest(appCode, localLang, localCountry) {
		
	  pingRequest = {};
	  pingRequest['appCode'] = appCode;
	  pingRequest['localeLanguage'] = localLang;
	  pingRequest['localeCountry'] = localCountry;
	  pingRequest['uuid'] = uuid.v1();
	
	  return pingRequest;
	}

	function buildCipheredRequest(appCode, localLang, localCountry, requestedData,keyAndIv, triggerUi){
	  
      request = {};
	  request['appCode'] = appCode;
	  request['localeLanguage'] = localLang;
	  request['localeCountry'] = localCountry;
	  request['uuid'] = uuid.v1();
	  request['key'] = slaUtils.uint8ArrayToB64(new Uint8Array(keyAndIv.key));
	  request['iv'] = slaUtils.uint8ArrayToB64(keyAndIv.iv);
	  request['payload'] = requestedData;
	  request['triggerUi'] = triggerUi;
	
	  return request;
	}

	function buildRequest(appCode, localLang, localCountry, requestedData, triggerUi) {
		
	  var insecureRequest = {}; //--
	  insecureRequest['appCode'] = appCode;
	  insecureRequest['localeLanguage'] = localLang;
	  insecureRequest['localeCountry'] = localCountry;
      insecureRequest['uuid'] = uuid.v1();
	  insecureRequest['payload'] = requestedData;
	  insecureRequest['triggerUi'] = triggerUi;
	
	  return insecureRequest;
	}

	function buildReadRequest(appCode, localLang, localCountry, requestedData, keyAndIv, triggerUi) {
		
	  readRequest = buildCipheredRequest(appCode, localLang, localCountry, requestedData, keyAndIv, triggerUi);
	  readRequest['requestPin'] = false;
	
	  return readRequest;
	}

    function buildInsecureReadRequest(appCode, localLang, localCountry, requestedData, triggerUi) {
	
      insecureReadRequest = buildRequest(appCode, localLang, localCountry, requestedData,triggerUi);

      return insecureReadRequest;
    }

	function buildAuthRequest(appCode, localLang, localCountry, requestedData, keyAndIv, triggerUi, forceAuth) {
		
	  authRequest = buildCipheredRequest(appCode, localLang, localCountry, requestedData, keyAndIv, triggerUi);
	  authRequest['requestPin'] = true;
	  authRequest['forcePin'] = forceAuth;
	
	  return authRequest;
	}

	function buildSignRequest(appCode, localLang, localCountry, dataToSign, keyAndIv, signerId, triggerUi) {
		
	  signRequest = buildCipheredRequest(appCode, localLang, localCountry, null, keyAndIv, triggerUi);;
	  signData = {};
	  signData['signerId'] = signerId;
	  signData['dataToSign'] = slaUtils.uint8ArrayToB64(new Uint8Array(slaUtils.stringToArrayBuffer(dataToSign)));
	  signRequest['payload'] = signData;
	
	  return signRequest;
	}
  
	function buildSignRequestB64(appCode, localLang, localCountry, dataToSign, pdfSettings, keyAndIv, signerId, triggerUi) {
		
	  signRequest = buildCipheredRequest(appCode, localLang, localCountry, null, keyAndIv, triggerUi);;
	  signData = {};
	  signData['signerId'] = signerId;
	  signData['dataToSign'] = dataToSign;
	  signData['pdfSettings'] = pdfSettings;
	  signRequest['payload'] = signData;
	  console.log("TESTESTESTESTESTESTESTES");
	  return signRequest;
	}


  return {
    buildPingRequest: buildPingRequest,
    buildReadRequest: buildReadRequest,
    buildInsecureReadRequest: buildInsecureReadRequest,
    buildAuthRequest: buildAuthRequest,
    buildSignRequest: buildSignRequest,
    buildSignRequestB64: buildSignRequestB64
  }
})();