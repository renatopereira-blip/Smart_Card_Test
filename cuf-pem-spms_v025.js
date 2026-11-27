/**
 * @license
 * Copyright 2023 CUF – Serviços de Saúde, Administrativos e Operacionais, ACE. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview This is a normalization which uses CUF Smart Card client API
 * and implement the functions (almost all) found in SPMS sla-app.js
 * provided be SPMS
 * 
 */


/**
    * Implements reaction to API events. This function should be subscribed to 
    * Smart Card Client API (SCCClient).
    * 
    * @param {string} name the name of the event
    * @param {any} oldValue value before event
    * @param {any} newValue value after event
    */
function onSCAPINotification(name, oldValue, newValue) {
   console.log("API PEM SPMS Notification:", name, newValue);
   switch (name) {
      case "subscribe": {
         console.log("API PEM SPMS subscribe to SCClient:", oldValue, newValue);
      }
      case "pinInserted": {
         console.log("SC API Notification pin inserted:", newValue);
         composeSignAuth(newValue);
      }
      case "statusChanged": {
         console.log("SC API Notification for status changed:", newValue);
         break;
      }
      case "currentResultChanged": {
         // sign is the current result?
         console.log("CURRENT RESULT CHANGED:", oldValue, newValue);
         const result = SCClient.currentResult;
         if (result.body.programName == 'verifyAuthenticationPIN' && result.body.responseDataHEX == '9000') {
            console.log("PIN CODE VALIDATED");
            const signerId = SCClient.certificateSubject.SERIALNUMBER;
            const appVersion = SCClient.appVersion;
            const authResponse = {
               uuid: "e3cbd820-8d3e-11ee-a6ea-0d8d7c3e2b77",
               ruuid: newValue.uuid,
               isOk: true,
               appVersion: appVersion,
               responseType: "auth",
               payload: {
                  plainXmlDocument: "<ompt app-version=\"3.1.0\" hostname=\"lp013882\" ip-address=\"lp013882/10.200.165.197\" java-vendor=\"Oracle Corporation\" java-version=\"1.8.0_202\" mac-address=\"0433C2AD4061\" os-name=\"Windows 10\" os-version=\"10.0\" requestId=\"e3cbd820-8d3e-11ee-a6ea-0d8d7c3e2b77\" timestamp=\"20231127160624\"/>\r\n",
                  signerId,
                  signedXmlDocument: "NGLmlbvNlE/1wzUusybsFG0Pgy1h0t5dhTHhPISnm1A2PMhWuKhujc4SxU9mO1qWHAv8j8zWtT2TBesuuUx6b3Kzg7vqsqNplR6mcB6YlhWFSPK2CziYvxKbdVlGDSf1jFzqlZz2eQnXjNZjczoUeoeJdwNl588p5S6NyxVZZKhqjv0gr/EYMbzz45Vbxl5ZY1edD11/yOXJ8rcw2SRzuxeMgaGFVYRst5qsZ/BIrvJExKeUvY4yXDks0nsX/ADTY4QIW7LR3NlIHeiEPO7bL1FH3l+xvjntWEbAeP/OgX1fGer5QYcoOx7sr/VWJJUZpMUqeYW8Aj+v3VeCKwn+eg==",
                  userCertificate: SCClient.data.certificate, // string HEX
                  subCaCertificate: SCClient.data.certificateIssuer, // string HEX
               }
            }
            toConsole(authResponse);
         } else if(result.body.programName == 'verifyAuthenticationPIN' && result.body.responseDataHEX == '9000') {
            console.warn("FAILED TO VALIDATED PIN CODE:", result);
         }

      }
      default:
         break;
   }
}

function composeSignAuth(msgOut) {
   console.log("COMPOSE AUTH RESPONSE");
   let plainXmlDocument = `
   <ccpt app-version="${SCClient.data.appVersion}" timestamp="${Date.now}">
      <basicInformation>
         <name>${SCClient.data.Name}</name>
         <surname>${SCClient.data.LastName}</surname>
      </basicInformation>
      <civilInformation>
         <gender>${SCClient.data.Gender}</gender>
         <dateOfBirth>${SCClient.data.BirthDate}</dateOfBirth>
      </civilInformation>
      <IdentificationNumbers>
         <HealthNo>${SCClient.data.HealthSystemNumber}</HealthNo>
         <TaxNo>${SCClient.data.TaxNumber}</TaxNo>
         <SocialSecurityNo>${SCClient.data.SocialSecurityNumber}</SocialSecurityNo>
      </IdentificationNumbers>
   </ccpt>
   `;
   if (SCClient.data.cardType == 'PMCA') {
      plainXmlDocument = `
         <ompt app-version="${SCClient.data.appVersion}" timestamp="${Date.now}">
   `
   }
   // const authResponse = {
   //    appVersion,
   //    isOk: true,
   //    uuid: '',
   //    ruuid: msgOut.uuid,
   //    responseType: "auth",
   //    payload: {
   //       plainXmlDocument,
   //       signedXmlDocument: "",
   //       signerId,
   //       userCertificate: SCClient.certificate,
   //       subCaCertificate: SCClient.certificateSubject.subjectPublicKey.n
   //    }
   // }
   // Encode user info to Base64 and sign it
   const encodedXmlPublicData = btoa(plainXmlDocument);
   SCClient.signAuth(encodedXmlPublicData);
}

function toConsole(msg) {
   console.log(msg);
}

const slaApp = (function () {
   const SCClient = new CUFSmartCardClient();
   let app;
   let appStatus = AppStatusEnum.UNKNOWN;
   let localeLanguage, localeCountry;
   let pingThread = null;
   let pingThreadInterval;
   let genericScb = null;
   let genericFcb = null;
   let authScb = toConsole;
   let authFcb = toConsole;
   let signScb = toConsole;
   let signFcb = toConsole;



   /**
   * Application initializer. When this script is load this function is executed
   *
   * @param {string} application - starting app name or code
   * @param {string} [language=en] - language to use (defaults to EN)
   * @param {number} [pingRequestInterval=20] - interval between automatic ping requests (defaults to 20).
   * @param {function} [successCb=console.log] - function to be called when to display the results of a successful interaction, defaults to console.log
   * @param {function} [failureCb=console.log] - function to be called when to display the results of a failed interaction, defaults to console.log.
   */
   function init(application, language, pingRequestInterval, successCb, failureCb) {
      console.log("API PEM SPMS init:", application);
      // Subscribes function to API to be notified when an event is triggered
      SCClient.subscribe(onSCAPINotification);

      // Initialize API and Extension
      SCClient.getStatus();

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
    * @param {*} scb succeed callback
    * @param {*} fcb falied callback
    */
   function ping(scb, fcb) {
      //Case App didn't start
      if (!checkAppStatus(AppStatusEnum.STARTED))
         throw 'unexpected application status';

      var localScb = slaUtils.isFunction(scb) ? scb : genericScb
      var localFcb = slaUtils.isFunction(fcb) ? fcb : genericFcb

      // Gets Smart Card status;
      SCClient.getStatus();

      AppStatusEnum.properties[appStatus].isConnected = SCClient.data.cardType != null;
      setBackendStatus(SCClient.data);
      localScb(AppStatusEnum.properties[appStatus]);
   }

   /**
   * Checks for a running backend instance, setting all the relevant parameters when one is found, with UI interface.
   *
   */
   function pingUI(scb, fcb) {

      if (!checkAppStatus(AppStatusEnum.STARTED))
         throw 'unexpected application status';

      var localScb = slaUtils.isFunction(scb) ? scb : genericScb
      var localFcb = slaUtils.isFunction(fcb) ? fcb : genericFcb

      AppStatusEnum.properties[appStatus].isConnected = SCClient.data.cardType != null;
      setBackendStatus(SCClient.data);
      localScb(AppStatusEnum.properties[appStatus]);
   }

   /**
   * Checks if the current app status matches a given value of AppStatusEnum.
   * If no value is provided, the current app status is printed.
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
      if (backendResponse !== undefined && backendResponse !== null) {
         AppStatusEnum.properties[appStatus].cardReaderPresent = backendResponse.isConnected;
         AppStatusEnum.properties[appStatus].cardType = backendResponse.isConnected ? backendResponse.cardType : null;
         AppStatusEnum.properties[appStatus].errorCode = backendResponse.appReturn != null ? backendResponse.appReturn.code : null;
         AppStatusEnum.properties[appStatus].errorDescription = backendResponse.appReturn != null ? backendResponse.appReturn.message : null;
         AppStatusEnum.properties[appStatus].appVersion = backendResponse.appVersion;
      }
   }

   /**
   * Performs a strong authentication
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
      console.log("API PEM SPMS Authenticate:", requestedData);
      // if (!checkAppStatus(AppStatusEnum.STARTED) || !AppStatusEnum.properties[appStatus].isConnected) {
      //    throw 'unexpected application status';
      // }
      console.log("API PEM SPMS Application is STARTED:", requestedData);
      // var lscb = (scb === undefined || scb === null || !scaUtils.isFunction(scb)) ? authScb : scb;
      // var lfcb = (fcb === undefined || fcb === null || !scaUtils.isFunction(fcb)) ? authFcb : fcb;

      authScb = slaUtils.isFunction(scb) ? scb : genericScb
      authFcb = slaUtils.isFunction(fcb) ? fcb : genericFcb

      if (forceAuth || triggerUi) {
         SCClient.signInAuth();
         setTimeout(() => {
            SCClient.getCurrentResult();
         }, 10000);
      }
      SCClient.read("public-data");
      SCClient.read("signature-certificate");
      SCClient.read("issuer-certificate");
      // Due to loosely coupled architecture in Chrome OS Smart card API, this data could not be available 
      // when this callback occurs to pass information when is available should be implemented in 
      // function onSCAPINotification to change application (SPMS PEM) state.
      // localScb(SCClient.data);
   }

   /**
   * Performs digital signature over PDF documents
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

      var signScb = slaUtils.isFunction(scb) ? scb : genericScb
      var signFcb = slaUtils.isFunction(fcb) ? fcb : genericFcb

      if (forceAuth || triggerUi) {
         SCClient.signIn();
      }
      SCClient.signPdf(document, pdfSignSettings);
      // Due to loosely coupled architecture in Chrome OS Smart card API, this data could not be available 
      // when this callback occurs to pass information when is available should be implemented in 
      // function onSCAPINotification to change application (SPMS PEM) state.
      // localScb(SCClient.getCurrentResult());
   }

   /**
    * Performs digital signature over plain documents
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

      if (forceAuth || triggerUi) {
         SCClient.signIn();
      }
      SCClient.sign(document);
      // Due to loosely coupled architecture in Chrome OS Smart card API, this data could not be available 
      // when this callback occurs to pass information when is available should be implemented in 
      // function onSCAPINotification to change application (SPMS PEM) state.
      localScb(SCClient.getCurrentResult());
   }

   // Public methods
   return {
      init: init,
      ping: ping,
      pingUI: pingUI,
      checkAppStatus: checkAppStatus,
      // read: read,
      // insecureRead: insecureRead,
      authenticate: authenticate,
      sign: sign,
      signPlainDocument: signPlainDocument
   };
})();

/**
 * Initialize and subscribe this API to CUF Smartcard Client API.
 */
// slaApp.init();


