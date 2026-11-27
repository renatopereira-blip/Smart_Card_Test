// Main app
var slaApp = (function () {

  // Private vars
  var app;
  var appStatus = AppStatusEnum.UNKNOWN;

  var localeLanguage, localeCountry;

  var availableHosts = slaUtils.shuffleArray([
    { dns: 'e45.sla.min-saude.pt', port: 37605 },
    { dns: 'f33.sla.min-saude.pt', port: 38110 },
    { dns: 'a12.sla.min-saude.pt', port: 48601 },
    { dns: 'h34.sla.min-saude.pt', port: 51404 },
    { dns: 'u45.sla.min-saude.pt', port: 56912 },
    { dns: 'i45.sla.min-saude.pt', port: 59856 },
    { dns: 'j45.sla.min-saude.pt', port: 60278 },
    { dns: 'q45.sla.min-saude.pt', port: 61339 },
    { dns: 'o45.sla.min-saude.pt', port: 61592 },
    { dns: 'f45.sla.min-saude.pt', port: 62441 },
    { dns: 'z45.sla.min-saude.pt', port: 63315 },
    { dns: 'm45.sla.min-saude.pt', port: 64196 },
    { dns: 'n45.sla.min-saude.pt', port: 40644 },
    { dns: 'j45.sla.min-saude.pt', port: 55103 },
    { dns: 'h45.sla.min-saude.pt', port: 53269 },
    { dns: 'd45.sla.min-saude.pt', port: 57771 },
    { dns: 's45.sla.min-saude.pt', port: 52133 },
    { dns: 'q45.sla.min-saude.pt', port: 49610 },
    { dns: 'z45.sla.min-saude.pt', port: 41490 },
    { dns: 'r45.sla.min-saude.pt', port: 54045 },
    { dns: 't45.sla.min-saude.pt', port: 55377 },
    { dns: 'q45.sla.min-saude.pt', port: 61185 },
    { dns: 'y45.sla.min-saude.pt', port: 60894 },
    { dns: 'i45.sla.min-saude.pt', port: 40226 },
    { dns: 'p45.sla.min-saude.pt', port: 56557 }
  ]);

  var pingThread = null;
  var pingThreadInterval;

  var genericScb = null;
  var genericFcb = null; //Success and failure callback functions


  /**
   * Application initializer.
   *
   * @author bruno.meira
   * @date 22/08/2018
   * @version 1.2
   * @changes added success and failure callback functions
   *
   * @param {string} application - starting app name or code
   * @param {string} [language=en] - language to use (defaults to EN)
   * @param {number} [pingRequestInterval=20] - interval between automatic ping requests (defaults to 20).
   * @param {function} [successCb=console.log] - function to be called when to display the results of a successful interaction, defaults to console.log
   * @param {function} [failureCb=console.log] - function to be called when to display the results of a failed interaction, defaults to console.log.
   */
  function init(application, language, pingRequestInterval, successCb, failureCb) {

    //Check if application has already started
    if (checkAppStatus(AppStatusEnum.STARTED)) throw 'application already started';

    //Check if application name is correct 
    if (application === null || application === undefined || typeof application !== 'string') {
      appStatus = AppStatusEnum.FAILED;
      AppStatusEnum.properties[appStatus].error = 'no application provided';
      throw 'invalid application - must be supplied';
    }

    //Check if variable pingRequestInterval is defined correctly and with a value(20 as default)
    if (pingRequestInterval === undefined || pingRequestInterval === null) {
      pingRequestInterval = 20;
    } else if (typeof pingRequestInterval !== 'number') {
      appStatus = AppStatusEnum.FAILED;
      AppStatusEnum.properties[appStatus].error = 'invalid ping interval';
      throw 'null or invalid request timeout - must be in seconds';
    }

    //Check if variable language is defined correctly and with a value (default "en")
    if (language === undefined || language === null) {
      language = 'en';
    } else if (typeof language !== 'string') {
      appStatus = AppStatusEnum.FAILED;
      AppStatusEnum.properties[appStatus].error = 'invalid language parameter'
      throw 'null or invalid language';
    }

    appStatus = AppStatusEnum.STARTED;
    AppStatusEnum.properties[appStatus].connectedURL = null;
    AppStatusEnum.properties[appStatus].isConnected = false;

    switch (language) {
      case 'pt':
        localeLanguage = 'pt';
        localeCountry = 'PT';
        break;
      default:
        localeLanguage = 'en';
        localeCountry = 'GB';
    }

    genericScb = slaUtils.isFunction(successCb) ? successCb : console.log;
    genericFcb = slaUtils.isFunction(failureCb) ? failureCb : console.log;

    app = application;
    pingThreadInterval = pingRequestInterval;
  }


  /**
   * Checks for a running backend instance, setting all the relevant parameters when one is found.
   *
   * @author bruno.meira
   * @date 14/06/2018
   * @version 1.3
   * @changes added ability to specify success and callback functions
   */
  function ping(scb, fcb) {

    //Case App didn't start
    if (!checkAppStatus(AppStatusEnum.STARTED))
      throw 'unexpected application status';

    var localScb = slaUtils.isFunction(scb) ? scb : genericScb
    var localFcb = slaUtils.isFunction(fcb) ? fcb : genericFcb

    if (AppStatusEnum.properties[appStatus].isConnected === true) {
      slaAjax.doPost(
        AppStatusEnum.properties[appStatus].connectedURL + 'ping',
        slaRequestFactory.buildPingRequest(app, localeLanguage, localeCountry),
        function (result) {
          setBackendStatus(result);
          localScb(checkAppStatus(null));
        },
        function (error) {
          AppStatusEnum.properties[appStatus].isConnected = false;
          AppStatusEnum.properties[appStatus].connectedURL = null;
          localFcb(checkAppStatus(null));
        },
        window.location.host
      );
    } else {
      failedHosts = 0;
      for (var i = 0; i < availableHosts.length; i++) {

        endpoint = availableHosts[i];
        url = 'https://' + endpoint.dns + ':' + endpoint.port + '/';

        slaAjax.doPost(
          url + 'ping',
          slaRequestFactory.buildPingRequest(app, localeLanguage, localeCountry),
          function (result) {
            AppStatusEnum.properties[appStatus].isConnected = true;
            AppStatusEnum.properties[appStatus].connectedURL = 'https://' + result.appHostname + ':' + result.appPort + '/';
            setBackendStatus(result);
            //setPingThreadInterval(); // Set default thread interval
            localScb(checkAppStatus());
          },
          function (error) {
            failedHosts++;
            if (failedHosts == availableHosts.length && AppStatusEnum.properties[appStatus].isConnected !== true) {
              AppStatusEnum.properties[appStatus].isConnected = false;
              setBackendStatus(null);
              if (pingThread == null) { /*setPingThreadInterval(10);*/
              }
              localFcb(checkAppStatus(null));
            }
          },
          window.location.host
        );
      }
    }
  }

  /**
   * Checks for a running backend instance, setting all the relevant parameters when one is found, with UI interface.
   *
   * @author bruno.meira
   * @date 14/06/2018
   * @version 1.3
   * @changes added ability to specify success and callback functions
   */
  function pingUI(scb, fcb) {

    if (!checkAppStatus(AppStatusEnum.STARTED))
      throw 'unexpected application status';

    var localScb = slaUtils.isFunction(scb) ? scb : genericScb
    var localFcb = slaUtils.isFunction(fcb) ? fcb : genericFcb

    //var lscb = (scb === undefined || scb === null || !scaUtils.isFunction(scb)) ? genericScb : scb;
    //var lfcb = (fcb === undefined || fcb === null || !scaUtils.isFunction(fcb)) ? genericFcb : fcb;

    if (AppStatusEnum.properties[appStatus].isConnected === true) {
      slaAjax.doPost(
        AppStatusEnum.properties[appStatus].connectedURL + 'pingui',
        slaRequestFactory.buildPingRequest(app, localeLanguage, localeCountry),
        function (result) {
          setBackendStatus(result);
          localScb(checkAppStatus(null));
        },
        function (error) {
          AppStatusEnum.properties[appStatus].isConnected = false;
          AppStatusEnum.properties[appStatus].connectedURL = null;
          localFcb(checkAppStatus(null));
          //setPingThreadInterval(10); // tighten the thread interval
        },
        window.location.host
      );
    } else {
      failedHosts = 0;
      for (var i = 0; i < availableHosts.length; i++) {

        endpoint = availableHosts[i];
        url = 'https://' + endpoint.dns + ':' + endpoint.port + '/';

        slaAjax.doPost(
          url + 'pingui',
          slaRequestFactory.buildPingRequest(app, localeLanguage, localeCountry),
          function (result) {
            AppStatusEnum.properties[appStatus].isConnected = true;
            AppStatusEnum.properties[appStatus].connectedURL = 'https://' + result.appHostname + ':' + result.appPort + '/';
            setBackendStatus(result);
            //setPingThreadInterval(); // Set default thread interval
            localScb(checkAppStatus());
          },
          function (error) {
            failedHosts++;
            if (failedHosts == availableHosts.length && AppStatusEnum.properties[appStatus].isConnected !== true) {
              AppStatusEnum.properties[appStatus].isConnected = false;
              setBackendStatus(null);
              if (pingThread == null) { /*setPingThreadInterval(10);*/
              }
              localFcb(checkAppStatus(null));
            }
          },
          window.location.host
        );
      }
    }
  }

  /**
   * Checks if the current app status matches a given value of AppStatusEnum.
   * If no value is provided, the current app status is printed.
   *
   * @author bruno.meira
   * @date 08/06/2018
   * @version 1.0
   *
   * @param {AppStatusEnum} [expectedStatus=null] - expected AppStatusEnum value
   * @returns {boolean} true if expectedStatus matches current application status
   * @returns {JSON} current app status if no expected status is provided
   */
  function checkAppStatus(expectedStatus) {
    if (expectedStatus === undefined || expectedStatus === null) {
      var currentAppStatus = {};
      currentEnum = slaUtils.getEnumKeyFromValue(AppStatusEnum, appStatus)
      currentAppStatus = AppStatusEnum.properties[appStatus];
      currentAppStatus['appStatus'] = currentEnum;
      return currentAppStatus;
    } else if (expectedStatus === appStatus) {
      return true;
    } else {
      return false;
    }

  }

  /**
   * Sets the appStatus variable with a backend response.
   *
   * @author bruno.meira
   * @date 14/06/2018
   * @version 1.1
   * @changes New backend response structure
   *
   * @param {JSON} [backendResponse=null] - backend server response
   */
  function setBackendStatus(backendResponse) {
    if (!checkAppStatus(AppStatusEnum.STARTED))
      throw 'unexpected application status';

    //TODO: Replace stupid -400 error code
    if (backendResponse === undefined || backendResponse === null) {
      AppStatusEnum.properties[appStatus].cardReaderPresent = null;
      AppStatusEnum.properties[appStatus].cardType = null;
      AppStatusEnum.properties[appStatus].errorCode = -400
      AppStatusEnum.properties[appStatus].errorDescription = 'backend not running';
      AppStatusEnum.properties[appStatus].appVersion = null;
      return;
    }
    if (backendResponse.payload !== undefined && backendResponse.payload !== null) {
      AppStatusEnum.properties[appStatus].cardReaderPresent = backendResponse.payload.isCardReaderPresent;
      AppStatusEnum.properties[appStatus].cardType = backendResponse.payload.isSmartCardPresent ? backendResponse.scType : null;
      AppStatusEnum.properties[appStatus].errorCode = backendResponse.payload.errorCode;
      AppStatusEnum.properties[appStatus].errorDescription = backendResponse.payload.errorDescription;
      AppStatusEnum.properties[appStatus].appVersion = backendResponse.payload.appVersion;
    }
  }

  /**
   * Sets the ping thread running interval.
   * Any previous thread is cleared before creating a new one.
   * If the interval is undefined or incorrectly defined, the default interval is set.
   *
   * @author bruno.meira
   * @date 14/06/2018
   * @version 1.1
   * @changes Updated to match new ping logic (alive replacement)
   *
   * @param {number} [interval=20] - thread interval
   */
  function setPingThreadInterval(interval) {
    if (!checkAppStatus(AppStatusEnum.STARTED))
      throw 'unexpected application status';

    clearInterval(pingThread);
    if (interval === undefined || interval === null || !slaUtils.isNumeric(interval))
      interval = pingThreadInterval;

    pingThread = setInterval(
      function () {
        ping();
      },
      interval * 1000);
  }


  /**
   * Reads a card's public data values
   *
   * @author bruno.meira
   * @date 12/06/2018
   * @version 1.2
   * @changes added ability to specify success and callback functions
   *
   * @param {JSON} requestedData - fields to obtain from card.
   * requestData should be an object with one field (it is expected that the name matches the card structure).
   * That field's value should be a String Array containing all the requested fields (flattened in accordance
   * with the defined XML document ). Example: {ccpt: ["basicInformation.name", "identificationNumbers.healthNo"]}
   * @param {boolean} [triggerUi=false] - flag to indicate if JavaFX component should be triggered for more than requesting pin
   * @param {function} scb - success callback function
   * @param {function} fcb - failure callback function
   */
  function read(requestedData, triggerUi, scb, fcb) {
    if (!checkAppStatus(AppStatusEnum.STARTED) || !AppStatusEnum.properties[appStatus].isConnected)
      throw 'unexpected application status';

    var localScb = slaUtils.isFunction(scb) ? scb : genericScb
    var localFcb = slaUtils.isFunction(fcb) ? fcb : genericFcb

    //var lscb = (scb === undefined || scb === null || !scaUtils.isFunction(scb)) ? genericScb : scb;
    //(var lfcb = (fcb === undefined || fcb === null || !scaUtils.isFunction(fcb)) ? genericFcb : fcb;

    slaCrypto.generateKeyAndIv()
      .then(function (keyAndIv) {
        slaAjax.doPost(
          AppStatusEnum.properties[appStatus].connectedURL + 'read',
          slaRequestFactory.buildReadRequest(app, localeLanguage, localeCountry, requestedData, keyAndIv, triggerUi),
          function (result) {
            if (!result.payload.hasOwnProperty('errorCode')) {
              slaCrypto.decryptReadResponse(keyAndIv.rawKey, keyAndIv.iv, result.payload)
                .then(function (decData) {
                  result.payload = decData;
                  localScb(result);
                })
                .catch(function (error) {
                  localFcb(error);
                })
            } else {
              localScb(result);
            }
          },
          function (error) {
            localFcb(error);
          },
          window.location.origin
        );
      })
      .catch(function (error) {
        genericFcb(error);
      });
  }


  /**
   * Reads a card's public data values without cryptographic
   *
   * @author bruno.meira
   * @date 12/06/2018
   * @version 1.2
   * @changes added ability to specify success and callback functions
   *
   * @param {JSON} requestedData - fields to obtain from card.
   * requestData should be an object with one field (it is expected that the name matches the card structure).
   * That field's value should be a String Array containing all the requested fields (flattened in accordance
   * with the defined XML document ). Example: {ccpt: ["basicInformation.name", "identificationNumbers.healthNo"]}
   * @param {boolean} [triggerUi=false] - flag to indicate if JavaFX component should be triggered for more than requesting pin
   * @param {function} scb - success callback function
   * @param {function} fcb - failure callback function
   */
  function insecureRead(requestedData, triggerUi, scb, fcb) {
    if (!checkAppStatus(AppStatusEnum.STARTED) || !AppStatusEnum.properties[appStatus].isConnected)
      throw 'unexpected application status';

    var localScb = slaUtils.isFunction(scb) ? scb : genericScb
    var localFcb = slaUtils.isFunction(fcb) ? fcb : genericFcb

    //var lscb = (scb === undefined || scb === null || !scaUtils.isFunction(scb)) ? genericScb : scb;
    //var lfcb = (fcb === undefined || fcb === null || !scaUtils.isFunction(fcb)) ? genericFcb : fcb;

    slaAjax.doPost(
      AppStatusEnum.properties[appStatus].connectedURL + 'insecureread',
      slaRequestFactory.buildInsecureReadRequest(app, localeLanguage, localeCountry, requestedData, triggerUi),
      function (result) { localScb(result); },
      function (error) { localFcb(error) },
      window.location.origin
    );
  }


  /**
   * Performs a strong authentication
   *
   * @author bruno.meira
   * @date 30/08/2018
   * @version 1.3
   * @changes added ability to specify success and callback functions
   *
   * @param {JSON} requestedData - fields to obtain from card.
   * requestData should be an object with one field (it is expected that the name matches the card structure).
   * That field's value should be a String Array containing all the requested fields (flattened in accordance
   * with the defined XML document ). Example: {ccpt: ["basicInformation.name", "identificationNumbers.healthNo"]}
   * @param {boolean} [triggerUi=false] - flag to indicate if JavaFX component should be triggered for more than requesting pin
   * @param {boolean} [forceAuth=false] - flag to force a new authentication (bypass cached authentication)
   * @param {function} scb - success callback function
   * @param {function} fcb - failure callback function
   */
  function authenticate(requestedData, triggerUi, forceAuth, scb, fcb) {

    if (!checkAppStatus(AppStatusEnum.STARTED) || !AppStatusEnum.properties[appStatus].isConnected)
      throw 'unexpected application status';

    // var lscb = (scb === undefined || scb === null || !scaUtils.isFunction(scb)) ? genericScb : scb;
    // var lfcb = (fcb === undefined || fcb === null || !scaUtils.isFunction(fcb)) ? genericFcb : fcb;

    var localScb = slaUtils.isFunction(scb) ? scb : genericScb
    var localFcb = slaUtils.isFunction(fcb) ? fcb : genericFcb

    slaCrypto.generateKeyAndIv()
      .then(function (keyAndIv) {
        slaAjax.doPost(
          AppStatusEnum.properties[appStatus].connectedURL + 'auth',
          slaRequestFactory.buildAuthRequest(app, localeLanguage, localeCountry, requestedData, keyAndIv, triggerUi, forceAuth),
          function (result) {
            if (!result.payload.hasOwnProperty('errorCode')) {
              slaCrypto.decryptAuthResponse(keyAndIv.rawKey, keyAndIv.iv, result.payload)
                .then(function (decData) {
                  result.payload = decData;
                  localScb(result);
                })
                .catch(function (error) {
                  localFcb(error);
                })
            } else {
              localScb(result);
            }
          },
          function (error) {
            localFcb(error);
          },
          window.location.origin
        );
      })
      .catch(function (error) {
        genericFcb(error);
      });
  }

  /**
   * Performs a strong authentication
   *
   * @author bruno.meira
   * @date 30/08/2018
   * @version 1.3
   * @changes added ability to specify success and callback functions
   *
   * @param {JSON} document - Base64 encoded XML document to sign.
   * @param {String} signerId - signer's id (returned by the authentication process)
   * @param {boolean} [triggerUi=false] - flag to indicate if JavaFX component should be triggered for more than requesting pin
   * @param {JSON} pdfSettings - contains location for the pdf Signature, if empty default values are used.
   * @param {function} scb - success callback function
   * @param {function} fcb - failure callback function
   */
  function sign(document, signerId, triggerUi, pdfSignSettings, scb, fcb) {

    if (!checkAppStatus(AppStatusEnum.STARTED) || !AppStatusEnum.properties[appStatus].isConnected)
      throw 'unexpected application status';

    // var lscb = (scb === undefined || scb === null || !scaUtils.isFunction(scb)) ? genericScb : scb;
    // var lfcb = (fcb === undefined || fcb === null || !scaUtils.isFunction(fcb)) ? genericFcb : fcb;

    var localScb = slaUtils.isFunction(scb) ? scb : genericScb
    var localFcb = slaUtils.isFunction(fcb) ? fcb : genericFcb

    slaCrypto.generateKeyAndIv()
      .then(function (keyAndIv) {
        slaAjax.doPost(
          AppStatusEnum.properties[appStatus].connectedURL + 'sign',
          slaRequestFactory.buildSignRequestB64(app, localeLanguage, localeCountry, document, pdfSignSettings, keyAndIv, signerId, triggerUi),
          function (result) {
            //console.log('console -' + result.payload);
            if (!result.payload.hasOwnProperty('errorCode')) {

              localScb(result);

            } else {
              localScb(result);
            }
          },
          function (error) {
            localFcb(error);
          },
          window.location.origin
        );
      })
      .catch(function (error) {
        genericFcb(error);
      });
  }

  /**
   * Performs digital signature over plain documents
   *
   * @author Fabio Marques
   * @date 16/03/2020
   * @version 2.3
   * @changes added ability to specify success and callback functions
   *
   * @param {JSON} document - Base64 encoded XML document to sign.
   * @param {String} signerId - signer's id (returned by the authentication process)
   * @param {boolean} [triggerUi=false] - flag to indicate if JavaFX component should be triggered for more than requesting pin
   * @param {function} scb - success callback function
   * @param {function} fcb - failure callback function
   */
  function signPlainDocument(document, signerId, triggerUi, scb, fcb) {

    if (!checkAppStatus(AppStatusEnum.STARTED) || !AppStatusEnum.properties[appStatus].isConnected)
      throw 'unexpected application status';

    // var lscb = (scb === undefined || scb === null || !scaUtils.isFunction(scb)) ? genericScb : scb;
    // var lfcb = (fcb === undefined || fcb === null || !scaUtils.isFunction(fcb)) ? genericFcb : fcb;

    var localScb = slaUtils.isFunction(scb) ? scb : genericScb
    var localFcb = slaUtils.isFunction(fcb) ? fcb : genericFcb

    slaCrypto.generateKeyAndIv()
      .then(function (keyAndIv) {
        slaAjax.doPost(
          AppStatusEnum.properties[appStatus].connectedURL + 'sign',
          slaRequestFactory.buildSignRequest(app, localeLanguage, localeCountry, document, keyAndIv, signerId, triggerUi),
          function (result) {
            if (!result.payload.hasOwnProperty('errorCode')) {
              slaCrypto.decrypt(keyAndIv.rawKey, keyAndIv.iv, result.payload, true)
                .then(function (data) {
                  result.payload = data;
                  localScb(result);
                })
                .catch(function (error) {
                  localFcb(error);
                })
            } else {
              localScb(result);
            }
          },
          function (error) {
            localFcb(error);
          },
          window.location.origin
        );
      })
      .catch(function (error) {
        genericFcb(error);
      });
  }


  // Public methods
  return {
    init: init,
    ping: ping,
    pingUI: pingUI,
    checkAppStatus: checkAppStatus,
    read: read,
    insecureRead: insecureRead,
    authenticate: authenticate,
    sign: sign,
    signPlainDocument: signPlainDocument
  };

})();