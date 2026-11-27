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
 * provided be SPMS.
 * 
 * VERSION: 0.2.7 Beta
 * 
 */

class SLAApplication {
   /**
    * @member {CUFSmartCardClient} SCClient client API for CUF ChromeOS smartcard extension
    */
   SCClient = new CUFSmartCardClient();

   app;
   appStatus = AppStatusEnum.UNKNOWN;
   localeLanguage;
   localeCountry;
   pingThread = null;
   pingThreadInterval = 5;

   /** 
    * @member {array<function()>} observers
    */
   observers = [];

   /**
    * Subscribes a function to be executed on context data changed
    * 
    * @param {function()} func 
    */
   subscribe(func) {
      console.log("SLAApplication subscribe:", func);
      SLAApplication.instance.observers.push(func);
   }

   /**
    * Unsubscribes a function that is registered as an observer
    * 
    * @param {function()} func 
    */
   unsubscribe(func) {
      SLAApplication.instance.observers = SLAApplication.instance.observers.filter((observer) => observer !== func);
   }

   /**
    * When data is changed cycle all the subscribe functions and sends what changed the old value and new value
    * 
    * @param {string} name field name that was changed 
    * @param {any} oldValue field old value
    * @param {any} newValue field new value
    */
   notify(name, oldValue, newValue) {
      console.log("SLAApplication OBSERVERS:", SLAApplication.instance.observers);
      SLAApplication.instance.observers.forEach((observer) => { if (observer) observer(name, oldValue, newValue) });
   }

   constructor() {
      if (SLAApplication.instance) {
         return SLAApplication.instance;
      }

      SLAApplication.instance = this;

      return this;
   }

   /**
    * Implements reaction to API events. This function should be subscribed to 
    * Smart Card Client API (SCCClient).
    * 
    * @param {string} name the name of the event
    * @param {any} oldValue value before event
    * @param {any} newValue value after event
    */
   onSCAPINotification(name, oldValue, newValue) {
      console.log("SLAApplication onSCAPINotification:", { name, oldValue, newValue });
      switch (name) {
         case "subscribe": {
            console.log("SLAApplication onSCAPINotification[SUBSCRIBE]:", { name, oldValue, newValue });
            break;
         }
         case "pinInserted": {
            console.log("SLAApplication onSCAPINotification[PIN INSERTED]:", { name, oldValue, newValue });
            break;
         }
         case "statusChanged": {
            console.log("SLAApplication onSCAPINotification[STATUS CHANGED]:", { name, oldValue, newValue });
            break;
         }
         case "currentResultChanged": {
            console.log("SLAApplication onSCAPINotification[STATUS CHANGED]:", { name, oldValue, newValue });
            break;
         }
         case "gotResponse": {
            console.log("SLAApplication onSCAPINotification[GOT RESPONSE]:", { name, oldValue, newValue });
            switch (newValue.programName) {
               case 'signinAuthenticate':
                  SLAApplication.instance.notify('slaApp:authenticate', oldValue, newValue);
                  break;
               case 'signWithSignature':
                  SLAApplication.instance.notify('slaApp:sign', oldValue, newValue);
                  break;
               default:
                  SLAApplication.instance.notify(newValue.programName, oldValue, newValue);
                  break;
            }
            break;
         }
         default:
            console.log("SLAApplication onSCAPINotification[DEFAULT]:", { name, oldValue, newValue });
            SLAApplication.instance.notify(name, oldValue, newValue);
            break;
      }
   }

   /**
   * Application initializer. When this script is load this function is executed
   *
   * @param {string} application - starting app name or code
   * @param {string} [language=en] - language to use (defaults to EN)
   * @param {number} [pingRequestInterval=20] - interval between automatic ping requests (defaults to 20).
   * @param {function} [successCb=console.log] - ** NOT NEED ** function to be called when to display the results of a successful interaction, defaults to console.log
   * @param {function} [failureCb=console.log] - ** NOT NEED ** function to be called when to display the results of a failed interaction, defaults to console.log.
   */
   init(application, language, pingRequestInterval, _successCb, _failureCb) {
      console.log("SLAApplication INIT:", application);
      // Subscribes function to API to be notified when an event is triggered
      SLAApplication.instance.SCClient.subscribe(SLAApplication.instance.onSCAPINotification);
      // Initialize API and Extension with all the information needed
      SLAApplication.instance.SCClient.getStatus();
      SCClient.read("public-data");
      SCClient.read("signature-certificate");
      SCClient.read("issuer-certificate");

      //Check if application has already started
      if (SLAApplication.instance.checkAppStatus(AppStatusEnum.STARTED)) throw 'application already started';

      //Check if application name is correct 
      if (application === null || application === undefined || typeof application !== 'string') {
         SLAApplication.instance.appStatus = AppStatusEnum.FAILED;
         AppStatusEnum.properties[SLAApplication.instance.appStatus].error = 'no application provided';
         throw 'invalid application - must be supplied';
      }

      //Check if variable pingRequestInterval is defined correctly and with a value(20 as default)
      if (pingRequestInterval === undefined || pingRequestInterval === null) {
         pingRequestInterval = 20;
      } else if (typeof pingRequestInterval !== 'number') {
         SLAApplication.instance.appStatus = AppStatusEnum.FAILED;
         AppStatusEnum.properties[SLAApplication.instance.appStatus].error = 'invalid ping interval';
         throw 'null or invalid request timeout - must be in seconds';
      }

      //Check if variable language is defined correctly and with a value (default "en")
      if (language === undefined || language === null) {
         language = 'en';
      } else if (typeof language !== 'string') {
         SLAApplication.instance.appStatus = AppStatusEnum.FAILED;
         AppStatusEnum.properties[SLAApplication.instance.appStatus].error = 'invalid language parameter'
         throw 'null or invalid language';
      }

      SLAApplication.instance.appStatus = AppStatusEnum.STARTED;
      AppStatusEnum.properties[SLAApplication.instance.appStatus].connectedURL = null;
      AppStatusEnum.properties[SLAApplication.instance.appStatus].isConnected = false;

      switch (language) {
         case 'pt':
            SLAApplication.instance.localeLanguage = 'pt';
            SLAApplication.instance.localeCountry = 'PT';
            break;
         default:
            SLAApplication.instance.localeLanguage = 'en';
            SLAApplication.instance.localeCountry = 'GB';
      }

      SLAApplication.instance.app = application;
      SLAApplication.instance.pingThreadInterval = pingRequestInterval;

      // Starts cron alike to wait for register responses for specific interval
      SLAApplication.instance.SCClient.waitForResults(SLAApplication.instance.pingThreadInterval);
      const uuid = CUFSmartCardClient.uuidv4();
      const newValue = {
         app: SLAApplication.instance.app,
         appStatus: SLAApplication.instance.appStatus,
         localeLanguage: SLAApplication.instance.localeLanguage,
         localeCountry: SLAApplication.instance.localeCountry,
         pingThread: SLAApplication.instance.pingThread,
         pingRequestInterval: SLAApplication.instance.pingThreadInterval,
         uuid
      }
      SLAApplication.instance.notify("slaApp:Initialized", null, newValue)
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
    * @param {function} scb - ** NOT NEEDED ** success callback function
    * @param {function} fcb - ** NOT NEEDED ** failure callback function
    */
   authenticate(requestedData, triggerUi, forceAuth, _scb, _fcb) {
      console.log("SLAApplication AUTHENTICATE:", requestedData);
      // if (!SLAApplication.instance.checkAppStatus(AppStatusEnum.STARTED) || !AppStatusEnum.properties[SLAApplication.instance.appStatus].isConnected) {
      //    throw 'unexpected application status';
      // }
      SLAApplication.instance.SCClient.getStatus();
      console.log("SLAApplication AUTHENTICATE: is STARTED:", requestedData);
      const publicData = SLAApplication.instance.SCClient.cardPublicDataObject;
      if (publicData) {
         console.log("SLAApplication AUTHENTICATE: Public data is Available", publicData);
         const cardType = SLAApplication.instance.SCClient.cardType; 
         console.log(`SLAApplication AUTHENTICATE: Check card type ${typeof cardType}`, cardType);
         if (cardType === 'PCC' || cardType === 'PMAC') {
            console.log("SLAApplication AUTHENTICATE: Card Type is Available", cardType);
            let plainXmlDocument = `
               <ccpt app-version="${SCClient.data.appVersion}" timestamp="${Date.now()}">
                  <basicInformation>
                     <name>${SCClient.cardPublicDataObject.Name}</name>
                     <surname>${SCClient.cardPublicDataObject.LastName}</surname>
                  </basicInformation>
                  <civilInformation>
                     <gender>${SCClient.cardPublicDataObject.Gender}</gender>
                     <dateOfBirth>${SCClient.cardPublicDataObject.BirthDate}</dateOfBirth>
                  </civilInformation>
                  <IdentificationNumbers>
                     <HealthNo>${SCClient.cardPublicDataObject.HealthSystemNumber}</HealthNo>
                     <TaxNo>${SCClient.cardPublicDataObject.TaxNumber}</TaxNo>
                     <SocialSecurityNo>${SCClient.cardPublicDataObject.SocialSecurityNumber}</SocialSecurityNo>
                  </IdentificationNumbers>
               </ccpt>
            `;
            if (cardType === 'PMAC') {
               plainXmlDocument = `<ompt app-version="${SCClient.data.appVersion}" timestamp="${Date.now()}">`
            }
            // Encode user info to Base64 and sign it
            const encodedXmlPublicData = btoa(plainXmlDocument);
            const uuid = CUFSmartCardClient.uuidv4();
            const payload = {
               dataToBeSign: plainXmlDocument,
               encodeDataToBeSign: encodedXmlPublicData,
               uuid
            }
            SLAApplication.instance.SCClient.signInAuthentication(payload, uuid);
            SLAApplication.instance.notify('SCClient:signInAuthenticationInitialize', null, payload);
         } else {
            console.warn("SLAApplication AUTHENTICATE: Card Type is NOT Available", cardType);
            SLAApplication.instance.notify('SCClient:cardTypeNotAvailable', null, SLAApplication.instance.SCClient.data);
         }
      } else {
         console.warn("SLAApplication AUTHENTICATE: Public Data is NOT Available", publicData);
         SLAApplication.instance.notify('SCClient:publicDataNotAvailable', null, SLAApplication.instance.SCClient.data);
         SCClient.read('public-data');
      }
   }

   /**
   * Performs digital signature over PDF documents
   *
   * @param {JSON} document - Base64 encoded XML document to sign.
   * @param {String} signerId - signer's id (returned by the authentication process)
   * @param {boolean} [triggerUi=false] - flag to indicate if JavaFX component should be triggered for more than requesting pin
   * @param {JSON} pdfSettings - contains location for the pdf Signature, if empty default values are used.
   * @param {function} scb - ** NOT NEEDED ** success callback function
   * @param {function} fcb - ** NOT NEEDED ** failure callback function
   */
   sign(document, signerId, triggerUi, _scb, _fcb) {
      // if (!SLAApplication.instance.checkAppStatus(AppStatusEnum.STARTED) || !AppStatusEnum.properties[SLAApplication.instance.appStatus].isConnected)
      //    throw 'unexpected application status';

      // const uuid = CUFSmartCardClient.uuidv4();
      // const payload = {
      //    document, signerId, pdfSignSettings, triggerUi, uuid
      // }
      // SCClient.signWithSignature(document, signerId, pdfSignSettings, uuid, triggerUi);
      // SLAApplication.instance.notify('SCClient:signPDFWithSignatureInitialize', null, payload);
      SLAApplication.instance.signPlainDocument(document, signerId, triggerUi, _scb, _fcb);
   }

   /**
    * Performs digital signature over plain documents
    *
    * @param {JSON} document - Base64 encoded XML document to sign.
    * @param {String} signerId - signer's id (returned by the authentication process)
    * @param {boolean} [triggerUi=false] - flag to indicate if JavaFX component should be triggered for more than requesting pin
    * @param {function} scb - ** NOT NEEDED ** success callback function
    * @param {function} fcb - ** NOT NEEDED **failure callback function
    */
   signPlainDocument(document, signerId, triggerUi, _scb, _fcb) {

      // if (!SLAApplication.instance.checkAppStatus(AppStatusEnum.STARTED) || !AppStatusEnum.properties[SLAApplication.instance.appStatus].isConnected)
      //    throw 'unexpected application status';

      const uuid = CUFSmartCardClient.uuidv4();
      SLAApplication.instance.SCClient.signWithSignature(document, signerId, uuid, triggerUi);
      const payload = {
         document, signerId, uuid, triggerUi
      }
      SLAApplication.instance.notify('SCClient:signWithSignatureInitialize', null, payload);
   }

   /**
   * Checks for a running backend instance, setting all the relevant parameters when one is found.
   * 
    * @param {*} scb *** NOT NEEDED *** succeed callback
    * @param {*} fcb *** NOT NEEDED *** falied callback
    */
   ping(_scb, _fcb) {
      //Case App didn't start
      // if (!SLAApplication.instance.checkAppStatus(AppStatusEnum.STARTED))
      //    throw 'unexpected application status';

      // Gets Smart Card status;
      const oldValue = SLAApplication.instance.SCClient.data;
      SCClient.getStatus();
      const newValue = SLAApplication.instance.SCClient.data;
      SLAApplication.instance.notify('SCClient:statusChanged', oldValue, newValue);

      AppStatusEnum.properties[SLAApplication.instance.appStatus].isConnected = SCClient.data.cardType != null;
      SLAApplication.instance.setBackendStatus(SCClient.data);
      SLAApplication.instance.notify('slaApp:ping', SLAApplication.instance.appStatus, AppStatusEnum.properties[SLAApplication.instance.appStatus]);
   }

   /**
   * Checks for a running backend instance, setting all the relevant parameters when one is found, with UI interface.
   * 
    * @param {*} scb *** NOT NEEDED *** succeed callback
    * @param {*} fcb *** NOT NEEDED *** falied callback
    */
   pingUI(_scb, _fcb) {
      //Case App didn't start
      // if (!SLAApplication.instance.checkAppStatus(AppStatusEnum.STARTED))
      //    throw 'unexpected application status';

      // Gets Smart Card status;
      const oldValue = SLAApplication.instance.SCClient.data;
      SCClient.getStatus();
      const newValue = SLAApplication.instance.SCClient.data;
      SLAApplication.instance.notify('SCClient:statusChanged', oldValue, newValue);

      AppStatusEnum.properties[SLAApplication.instance.appStatus].isConnected = SCClient.data.cardType != null;
      SLAApplication.instance.setBackendStatus(SCClient.data);
      SLAApplication.instance.notify('slaApp:pingUI', SLAApplication.instance.appStatus, AppStatusEnum.properties[SLAApplication.instance.appStatus]);
   }

   /**
    * Checks if the current app status matches a given value of AppStatusEnum.
    * If no value is provided, the current app status is printed.
    *
    * @param {AppStatusEnum} [expectedStatus=null] - expected AppStatusEnum value
    * @returns {boolean} true if expectedStatus matches current application status
    * @returns {JSON} current app status if no expected status is provided
    */
   checkAppStatus(expectedStatus) {
      if (expectedStatus === undefined || expectedStatus === null) {
         var currentAppStatus = {};
         currentEnum = slaUtils.getEnumKeyFromValue(AppStatusEnum, SLAApplication.instance.appStatus)
         currentAppStatus = AppStatusEnum.properties[SLAApplication.instance.appStatus];
         currentAppStatus['appStatus'] = currentEnum;
         return currentAppStatus;
      } else if (expectedStatus === SLAApplication.instance.appStatus) {
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
   setBackendStatus(backendResponse) {
      if (!SLAApplication.instance.checkAppStatus(AppStatusEnum.STARTED))
         throw 'unexpected application status';

      //TODO: Replace stupid -400 error code
      if (backendResponse === undefined || backendResponse === null) {
         AppStatusEnum.properties[SLAApplication.instance.appStatus].cardReaderPresent = null;
         AppStatusEnum.properties[SLAApplication.instance.appStatus].cardType = null;
         AppStatusEnum.properties[SLAApplication.instance.appStatus].errorCode = -400
         AppStatusEnum.properties[SLAApplication.instance.appStatus].errorDescription = 'backend not running';
         AppStatusEnum.properties[SLAApplication.instance.appStatus].appVersion = null;
         return;
      }
      if (backendResponse !== undefined && backendResponse !== null) {
         AppStatusEnum.properties[SLAApplication.instance.appStatus].cardReaderPresent = backendResponse.isConnected;
         AppStatusEnum.properties[SLAApplication.instance.appStatus].cardType = backendResponse.isConnected ? backendResponse.cardType : null;
         AppStatusEnum.properties[SLAApplication.instance.appStatus].errorCode = backendResponse.appReturn != null ? backendResponse.appReturn.code : null;
         AppStatusEnum.properties[SLAApplication.instance.appStatus].errorDescription = backendResponse.appReturn != null ? backendResponse.appReturn.message : null;
         AppStatusEnum.properties[SLAApplication.instance.appStatus].appVersion = backendResponse.appVersion;
      }
   }
}

// Initialize slaApp to be available globally in page scope
const slaApp = new SLAApplication();

/*
// EXEMPLOS DE IMPLEMENTAÇÃO/INTEGRAÇÃO COM PEM

initCallback(name, _oldValue, newValue) {
   switch(name) {
      case "slaApp:Initialized" : {
         if(newValue.error.code == 'OK') {
            initScb(newValue);
         } else {
            initFcb(newValue);
         }
      }
      case "SCClient:statusChanged": {
         if(newValue.error.code == 'OK') {
            statusScb(newValue);
         } else {
            statusFcb(newValue);
         }
         break;
      }
      case "slaApp:ping": {
         if(newValue.error.code == 'OK') {
            pingScb(newValue);
         } else {
            pingFcb(newValue);
         }
         break;
      }
      default: break;
   }
}
initScb(newValue) {


}
initFcb(newValue) {


}


slaApp.subscribe(globalCallback);
slaApp.init(...bla, localScb, localFcb);


signCallback(_name, _oldValue, newValue) {
   if(newValue.error.code == 'OK') {
      localScb(newValue);
   } else {
      localFcb(newValue);
   }
}
signScb(newValue) {


}
signFcb(newValue) {


}

slaApp.subscribe(signCallback);
slaApp.sign(document, signerId, true, scb, fcb);

*/