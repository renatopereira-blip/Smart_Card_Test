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
 * VERSION: 0.3.4 Beta
 * 
 */


/*
* Conver HEX String to Binary format
*/
function hextobinary (value) {
   var bString = '';
   for( var i = 0; i < value.length; i +=2) {
     bString += String.fromCharCode( parseInt( value.substr( i, 2), 16));
   }
   return bString;
 }
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
   pingThreadInterval = 2;
   slaAuthData;
   slaAuthKey = '';
   slaDocumentID = '';

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
      //console.log("SLAApplication OBSERVERS:", SLAApplication.instance.observers);
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
      const self = SLAApplication.instance;
      //console.log("SLAApplication onSCAPINotification:", { name, oldValue, newValue });
      switch (name) {
         case "SCClient:subscribe": {
            //console.log("SLAApplication onSCAPINotification[SUBSCRIBE]:", { name, oldValue, newValue });
            break;
         }
         case "SCClient:pinInserted": {
            //console.log("SLAApplication onSCAPINotification[PIN INSERTED]:", { name, oldValue, newValue });
            break;
         }
         case "SCClient:statusChanged": {
            //console.log("SLAApplication onSCAPINotification[STATUS CHANGED]:", { name, oldValue, newValue });
            break;
         }
         case "SCClient:currentResultChanged": {
            //console.log("SLAApplication onSCAPINotification[CURRENT RESULT CHANGED]:", { name, oldValue, newValue });
            break;
         }
         case "gotResponse": {
            //console.log("SLAApplication onSCAPINotification[GOT RESPONSE]:", { name, oldValue, newValue });
            switch (newValue.body.programName) {
               case 'signinAuthentication': {
                  //console.log(`SLAApplication onSCAPINotification [signinAuthentication] [${oldValue}]:`, { name, oldValue, newValue });
                  // Compose response to PEM
                  const slaResponse = self.composeAuthenticateResponse(newValue);
                  //console.log(`SLAApplication onSCAPINotification [signinAuthentication] slaResponse [${oldValue}]:`, slaResponse);
                  // Notify all subscribers or what was called scb and/or fcb which were callback functions
                  self.notify('slaApp:authenticated', newValue, slaResponse);
                  break;
               }
               case 'signDataSignature': {
                  //console.log(`SLAApplication onSCAPINotification [signDataSignature] [${oldValue}]:`, { name, oldValue, newValue });
                  // Compose response to PEM
                  const slaResponse = self.composeSignDataResponse(newValue);
                  
                  // Notify all subscribers or what was called scb and/or fcb which were callback functions
                  if (slaResponse.payload && slaResponse.payload.documentId && slaResponse.payload.documentId =="999999") {
                     self.notify('slaApp:pdfSigned', newValue, slaResponse);
                     break;
                  }
                  // Notify all subscribers or what was called scb and/or fcb which were callback functions
                  self.notify('slaApp:signed', newValue, slaResponse);
                  
                  break;
               }
               default: {
                  //console.log(`SLAApplication onSCAPINotification[default] [${oldValue}]:`, { name, oldValue, newValue });
                  //self.notify(newValue.command, oldValue, newValue);
                  break;
               }
            }
            break;
         }
         default:
            //console.log("SLAApplication onSCAPINotification[DEFAULT]:", { name, oldValue, newValue });
            self.notify(name, oldValue, newValue);
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
      const self = SLAApplication.instance;
      // Subscribes function to API to be notified when an event is triggered
      self.SCClient.subscribe(SLAApplication.instance.onSCAPINotification);
      // Initialize API and Extension with all the information needed
      self.SCClient.initialize();


      //Check if application has already started
      if (self.checkAppStatus(AppStatusEnum.STARTED)) throw 'application already started';

      //Check if application name is correct 
      if (application === null || application === undefined || typeof application !== 'string') {
         self.appStatus = AppStatusEnum.FAILED;
         AppStatusEnum.properties[self.appStatus].error = 'no application provided';
         throw 'invalid application - must be supplied';
      }

      //Check if variable pingRequestInterval is defined correctly and with a value(20 as default)
      if (pingRequestInterval === undefined || pingRequestInterval === null) {
         pingRequestInterval = 20;
      } else if (typeof pingRequestInterval !== 'number') {
         self.appStatus = AppStatusEnum.FAILED;
         AppStatusEnum.properties[self.appStatus].error = 'invalid ping interval';
         throw 'null or invalid request timeout - must be in seconds';
      }

      //Check if variable language is defined correctly and with a value (default "en")
      if (language === undefined || language === null) {
         language = 'en';
      } else if (typeof language !== 'string') {
         self.appStatus = AppStatusEnum.FAILED;
         AppStatusEnum.properties[self.appStatus].error = 'invalid language parameter'
         throw 'null or invalid language';
      }

      self.appStatus = AppStatusEnum.STARTED;
      AppStatusEnum.properties[self.appStatus].connectedURL = null;
      AppStatusEnum.properties[self.appStatus].isConnected = false;

      switch (language) {
         case 'pt':
            self.localeLanguage = 'pt';
            self.localeCountry = 'PT';
            break;
         default:
            self.localeLanguage = 'en';
            self.localeCountry = 'GB';
      }

      self.app = application;
      self.pingThreadInterval = pingRequestInterval;

      // Starts cron alike to wait for register responses for specific interval
      self.SCClient.waitForResults(self.pingThreadInterval);

      // Notify slaApp API initialized
      const uuid = CUFSmartCardClient.uuidv4();
      const newValue = {
         app: self.app,
         appStatus: self.appStatus,
         localeLanguage: self.localeLanguage,
         localeCountry: self.localeCountry,
         pingThread: self.pingThread,
         pingRequestInterval: self.pingThreadInterval,
         uuid
      }
      self.notify("slaApp:Initialized", null, newValue)
   }

   /**
    * Performs a strong authentication
    * 
    * Events that can be caught in application subscribers
    *    SCClient:PublicDataNotAvailable
    *    SCClient:SignInAuthenticationInitialize
    *    SCClient:UserCertificateNotAvailable
    *    SCClient:CACertificateNotAvailable
    *    SCClient:CardTypeNotAvailable
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
      // *****************
      // NOT NEEDED for CUFSmartCardClient API
      //
      // if (!SLAApplication.instance.checkAppStatus(AppStatusEnum.STARTED) || !AppStatusEnum.properties[SLAApplication.instance.appStatus].isConnected) {
      //    throw 'unexpected application status';
      // }
      // *****************
      //
      // Fail safe ensure that all data is available if not notify
      // what is missing
      //
      const self = SLAApplication.instance;
      self.SCClient.getStatus();
      const cardType = self.SCClient.cardType;
      //console.log("SLAApplication AUTHENTICATE: is STARTED:", requestedData);
      //console.log(`SLAApplication AUTHENTICATE: Check SCClient data`, self.SCClient.data);
      //console.log(`SLAApplication AUTHENTICATE: Check card type ${typeof cardType}`, cardType);
      if (cardType == 'PCC' || cardType == 'PMAC' || cardType == 'PCC2') {
         //console.log("SLAApplication AUTHENTICATE: Card Type is Available", cardType);
         const caCertificate = self.SCClient.data.issuerCertificate;
         if (caCertificate) {
            //console.log("SLAApplication AUTHENTICATE: Issuer/CA Certificate  is Available", caCertificate);
            const userCertificate = self.SCClient.data.authCertificate;
            if (userCertificate) {
               //console.log("SLAApplication AUTHENTICATE: User Certificate  is Available", caCertificate);
               let plainXmlDocument = `<ompt app-version="${self.SCClient.data.appVersion}" timestamp="${Date.now()}">`
               if (cardType === 'PCC' || cardType === 'PCC2') {
                  const publicData = self.SCClient.data.cardPublicDataObject;
                  if (publicData) {
                     //console.log("SLAApplication AUTHENTICATE: Public Data is Available", publicData);
                     plainXmlDocument = `<ccpt app-version="${self.SCClient.data.appVersion}" timestamp="${Date.now()}">
<basicInformation>
<name>${self.SCClient.cardPublicDataObject.FirstName}</name>
<surname>${self.SCClient.cardPublicDataObject.LastName}</surname>
</basicInformation>
<civilInformation>
<gender>${self.SCClient.cardPublicDataObject.Gender}</gender>
<dateOfBirth>${self.SCClient.cardPublicDataObject.BirthDate}</dateOfBirth>
</civilInformation>
<IdentificationNumbers>
<HealthNo>${self.SCClient.cardPublicDataObject.HealthSystemNumber}</HealthNo>
<TaxNo>${self.SCClient.cardPublicDataObject.TaxNumber}</TaxNo>
<SocialSecurityNo>${self.SCClient.cardPublicDataObject.SocialSecurityNumber}</SocialSecurityNo>
</IdentificationNumbers>
</ccpt>`;
                  } else {
                     //console.warn("SLAApplication AUTHENTICATE: Public Data is NOT Available", publicData);
                     self.notify('SCClient:PublicDataNotAvailable', null, self.SCClient.data);
                     SCClient.read('public-data');
                     return;
                  }
               }
               
               let encodedXmlPublicData = btoa(plainXmlDocument);
               const uuid = CUFSmartCardClient.uuidv4();
               self.slaAuthData = encodedXmlPublicData;
               const payload = {
                  dataToBeSign: encodedXmlPublicData,
                  plainData: plainXmlDocument,
                  triggerAskPin: triggerUi,
                  forceAuth,
                  uuid
               }
               self.SCClient.signInAuthentication(payload, uuid);
               self.notify('SCClient:SignInAuthenticationInitialize', null, payload);
            } else {
               //console.warn("SLAApplication AUTHENTICATE: User Certificate NOT Available", userCertificate);
               self.notify('SCClient:UserCertificateNotAvailable', null, self.SCClient.data);
               SCClient.read('signature-certificate');
            }
         } else {
            //console.warn("SLAApplication AUTHENTICATE: CA Certificate NOT Available", caCertificate);
            self.notify('SCClient:CACertificateNotAvailable', null, self.SCClient.data);
            SCClient.read('issuer-certificate');
         }
      } else {
         //console.warn("SLAApplication AUTHENTICATE: Card Type is NOT Available", cardType);
         self.notify('SCClient:CardTypeNotAvailable', null, self.SCClient.data);
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
   signPlainDocument(document, signerIdx, triggerUi, _scb, _fcb) {

      //console.log("SLAApplication SIGNATURE:", document);
      
      const self = SLAApplication.instance;
      self.SCClient.getStatus();
      if (document && signerIdx) {
         let xmlDoc = txml.simplify(txml.parse(atob(document)));
         if (xmlDoc.documents && xmlDoc.documents.document) {
            let documentToSign =  xmlDoc.documents.document[0];
            if(documentToSign==null){
               documentToSign =  xmlDoc.documents.document;
            }
            self.slaAuthData = documentToSign;
            const caCertificate = self.SCClient.data.signCertificate;
            if (caCertificate) {
               //console.log("SLAApplication SIGNATURE: Issuer/CA Certificate  is Available", caCertificate);
               const userCertificate = self.SCClient.data.signCertificate;
               if (userCertificate) {
                  //console.log("SLAApplication SIGNATURE: User Certificate  is Available", userCertificate);
                  const documentId = documentToSign.id;
                  const dataToBeSign = documentToSign.data;
                  const plainData = atob(dataToBeSign);
                  this.slaDocumentID = documentId;
                  const signerId = signerIdx;
                  const uuid = CUFSmartCardClient.uuidv4();
                  const payload = {
                     dataToBeSign,
                     plainData,
                     documentId,
                     signerId,
                     triggerAskPin: triggerUi,
                     forceAuth: triggerUi,
                     uuid
                  }
                  //console.log("SLAApplication SIGNATURE: payload", payload);
                  self.SCClient.signWithSignature(payload);
                  self.notify('SCClient:SignPlainDocumentInitialize', null, payload);
               } else {
                  //console.warn("SLAApplication SIGNATURE: User Certificate NOT Available", userCertificate);
                  self.notify('SCClient:UserCertificateNotAvailable', null, self.SCClient.data);
                  SCClient.read('signature-certificate');
               }
            } else {
               //console.warn("SLAApplication SIGNATURE: CA Certificate NOT Available", caCertificate);
               self.notify('SCClient:CACertificateNotAvailable', null, self.SCClient.data);
               SCClient.read('issuer-certificate');
            }
         }
      }else {
         self.notify('SCClient:SignPlainDocumentInitializeFail', null, null);
      }
   }

   signPDFWithSignature (pdfBase64, byteRange, contentsOffset, signerId, SIG_HEX_LEN, location, responseUUID, askPin) {
      const self = SLAApplication.instance;
      self.SCClient.getStatus();
      self.SCClient.signPDFWithSignature (pdfBase64, byteRange, contentsOffset, signerId, SIG_HEX_LEN, location, responseUUID, askPin);
   }
  
   
   /**
    * 
    * @param {string} base64Data base64 string to wrap in XML and convert to base64 again
    * @returns base64 string of the XML document with the base64 data inside (double base64)
    */
   wrapInDocumentXML(base64Data) {
      const xml = `<documents><document><id>999999</id><data>${base64Data}</data></document></documents>`;
      return btoa(xml);
   }


   /**
   * Checks for a running backend instance, setting all the relevant parameters when one is found.
   * 
    * @param {*} scb *** NOT NEEDED *** succeed callback
    * @param {*} fcb *** NOT NEEDED *** failed callback
    */
   ping(_scb, _fcb) {
      //Case App didn't start
      // if (!SLAApplication.instance.checkAppStatus(AppStatusEnum.STARTED))
      //    throw 'unexpected application status';
      const self = SLAApplication.instance;
      // Gets Smart Card status;
      const oldValue = self.SCClient.data;
      SCClient.getStatus();
      const newValue = self.SCClient.data;
      self.notify('SCClient:statusChanged', oldValue, newValue);

      AppStatusEnum.properties[self.appStatus].isConnected = SCClient.data.cardType != null;
      self.setBackendStatus(SCClient.data);
      self.notify('slaApp:ping', self.appStatus, AppStatusEnum.properties[self.appStatus]);
   }

   /**
   * Checks for a running backend instance, setting all the relevant parameters when one is found, with UI interface.
   * 
    * @param {*} scb *** NOT NEEDED *** succeed callback
    * @param {*} fcb *** NOT NEEDED *** failed callback
    */
   pingUI(_scb, _fcb) {
      //Case App didn't start
      // if (!SLAApplication.instance.checkAppStatus(AppStatusEnum.STARTED))
      //    throw 'unexpected application status';
      const self = SLAApplication.instance;
      // Gets Smart Card status;
      const oldValue = self.SCClient.data;
      SCClient.getStatus();
      const newValue = self.SCClient.data;
      self.notify('SCClient:statusChanged', oldValue, newValue);

      AppStatusEnum.properties[self.appStatus].isConnected = SCClient.data.cardType != null;
      self.setBackendStatus(SCClient.data);
      self.notify('slaApp:pingUI', self.appStatus, AppStatusEnum.properties[self.appStatus]);
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
      const self = SLAApplication.instance;
      if (expectedStatus === undefined || expectedStatus === null) {
         var currentAppStatus = {};
         currentEnum = slaUtils.getEnumKeyFromValue(AppStatusEnum, self.appStatus)
         currentAppStatus = AppStatusEnum.properties[self.appStatus];
         currentAppStatus['appStatus'] = currentEnum;
         return currentAppStatus;
      } else if (expectedStatus === self.appStatus) {
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
      const self = SLAApplication.instance;
      if (!self.checkAppStatus(AppStatusEnum.STARTED))
         throw 'unexpected application status';

      //TODO: Replace stupid -400 error code
      if (backendResponse === undefined || backendResponse === null) {
         AppStatusEnum.properties[self.appStatus].cardReaderPresent = null;
         AppStatusEnum.properties[self.appStatus].cardType = null;
         AppStatusEnum.properties[self.appStatus].errorCode = -400
         AppStatusEnum.properties[self.appStatus].errorDescription = 'backend not running';
         AppStatusEnum.properties[self.appStatus].appVersion = null;
         return;
      }
      if (backendResponse !== undefined && backendResponse !== null) {
         AppStatusEnum.properties[self.appStatus].cardReaderPresent = backendResponse.isConnected;
         AppStatusEnum.properties[self.appStatus].cardType = backendResponse.isConnected ? backendResponse.cardType : null;
         AppStatusEnum.properties[self.appStatus].errorCode = backendResponse.appReturn != null ? backendResponse.appReturn.code : null;
         AppStatusEnum.properties[self.appStatus].errorDescription = backendResponse.appReturn != null ? backendResponse.appReturn.message : null;
         AppStatusEnum.properties[self.appStatus].appVersion = backendResponse.appVersion;
      }
   }

   /**
    * Compose slaApp sign data response following requirements 
    * 
    * @param {MessageOut} newValue 
    */
   composeSignDataResponse(response) {
      //console.log(`SLAApplication [composeSignDataResponse]:`, response);
      const self = SLAApplication.instance;
      
      self.SCClient.getStatus();

      if (!self.SCClient.data.signCertificate) {
         throw "Generating signature";
      }

      if (!response.succeed){// && response.body.responseData.length  4){
      //if (!response.succeed || (response.body.responseData.length < 3 && response.body.responseData != '9000')) {
         const error = {
            erro: response.body.responseDataHEX,
            message: `Data sing failed with SC '${response.body.responseDataHEX}' error code`,
            payload: response
         }
         AppStatusEnum.properties[self.appStatus].errorCode = error.erro != null ? error.erro : null;
         AppStatusEnum.properties[self.appStatus].errorDescription = error.message != null ? error.message : null;
         console.warn(`SLAApplication [composeSignDataResponse] error:`, error);
         return error;
      }

      //
      var signBegin;
      signBegin = response.body.responseDataHEX.slice(-4);
      if (response.body.responseDataHEX.length > 10 && signBegin != "9000"){
         this.slaAuthKey = response.body.responseDataHEX.slice(0, -4);
         return;
      }else {
         if (this.SCClient.data.cardType == "PMAC") {
            this.slaAuthKey = "";
            this.slaAuthKey += response.body.responseDataHEX.slice(0, -4);
         }else {
            this.slaAuthKey += response.body.responseDataHEX.slice(0, -4);
         }
      }
      //
      const ruuid = CUFSmartCardClient.uuidv4();
      //
      const uuid = response.uuid;
      //console.log(`SLAApplication [composeSignDataResponse] uuid:`, uuid);
      //
      const signatureValue = btoa(hextobinary(this.slaAuthKey)); // ArrayBuffer
      //console.log(`SLAApplication [composeSignDataResponse] signXmlDocument:`, signatureValue);
      //
      const userCertificate = btoa(hextobinary(self.SCClient.data.signCertificate));
      //console.log(`SLAApplication [composeSignDataResponse] userCertificate:`, userCertificate);
      //
      const subCaCertificate = btoa(hextobinary(self.SCClient.data.issuerCertificate));
      //console.log(`SLAApplication [composeSignDataResponse] subCaCertificate:`, subCaCertificate);
      //
      const appVersion = SLAApplication.instance.SCClient.data.appVersion;
      //console.log(`SLAApplication [composeSignDataResponse] appVersion:`, appVersion);
      //
      let plainXmlDocument;
      plainXmlDocument = self.slaAuthData.data;
      const shaObj = new jsSHA("SHA-1", "B64");
      shaObj.update(plainXmlDocument);
      let digestValue = shaObj.getHash("HEX");
      //console.log ("SHA-1: " + sha1Hash);
      digestValue = btoa(hextobinary(digestValue.toUpperCase()));
      //
      var payloadPlain = `<Signature xmlns=\"http://www.w3.org/2000/09/xmldsig#\">
   <SignedInfo>
      <CanonicalizationMethod
            Algorithm=\"http://www.w3.org/TR/2001/REC-xml-c14n-20010315#WithComments\" />
      <SignatureMethod Algorithm=\"http://www.w3.org/2000/09/xmldsig#rsa-sha1\" />
      <Reference URI="">
            <DigestMethod Algorithm=\"http://www.w3.org/2000/09/xmldsig#sha1\" />
            <DigestValue>${digestValue}</DigestValue>
      </Reference>
   </SignedInfo>
   <SignatureValue>${signatureValue}</SignatureValue>
   <KeyInfo>
      <X509Data>
            <X509Certificate>${subCaCertificate}</X509Certificate>
            <X509Certificate>${userCertificate}</X509Certificate>
      </X509Data>
   </KeyInfo>
</Signature>`;
      
      //console.log(`SLAApplication [composeSignDataResponse] payloadPlain:`, payloadPlain);
      payloadPlain = btoa(payloadPlain);
      var payload = btoa(`<signatures><signature><id>${this.slaDocumentID}</id><data>${payloadPlain}</data></signature></signatures>`);
      const responseReturn = {
         uuid: "TBD",
         ruuid,
         isOk: response.error.code == 'OK',
         hasSignature: signatureValue!=null && signatureValue!="",
         appVersion,
         appHostname: "not applied",
         appPort: -1,
         responseType: "sign",
         payload //payload
      }
      //console.log(`SLAApplication [composeSignDataResponse] responseReturn:`, responseReturn);
      self.SCClient.clearResults();

      if (this.slaDocumentID == "999999") {
         payload = {
            documentId: this.slaDocumentID,
            signatureValue: signatureValue,
            digestValue: digestValue,
            userCertificate: userCertificate,
            subCaCertificate: subCaCertificate
         };
         const responseReturn = {
            uuid: "TBD",
            ruuid,
            isOk: response.error.code == 'OK',
            hasSignature: signatureValue!=null && signatureValue!="",
            appVersion,
            appHostname: "not applied",
            appPort: -1,
            responseType: "sign",
            b64pdf: response.body.b64pdf,
            payload //payload
         }
         return responseReturn;
      }
      return responseReturn;
   }
   /**
    * 
    * 
    * 
    */


   /**
    * Compose slaApp authenticate response following requirements 
    * 
    * @param {MessageOut} newValue 
    */
   composeAuthenticateResponse(response) {
      //console.log(`SLAApplication [composeAuthenticateResponse]:`, response);
      const self = SLAApplication.instance;
      
      if (!response.succeed && response.body.responseDataHEX.length < 4){// || (response.body.responseData.length < 3 && response.body.responseData != '9000')) {
         const error = {
            erro: response.body.responseDataHEX,
            message: `Data sing failed with SC '${response.body.responseDataHEX}' error code`,
            payload: response
         }
         AppStatusEnum.properties[self.appStatus].errorCode = error.erro != null ? error.erro : null;
         AppStatusEnum.properties[self.appStatus].errorDescription = error.message != null ? error.message : null;
         //console.warn(`SLAApplication [composeSignDataResponse] error:`, error);
         return error;
      }
      
      var signBegin;
      signBegin = response.body.responseDataHEX.slice(-4);
      if (response.body.responseDataHEX.length > 10 && signBegin != "9000"){
         this.slaAuthKey = response.body.responseDataHEX.slice(0, -4);
         return;
      }else {
         if (this.SCClient.data.cardType == "PMAC") {
            this.slaAuthKey = "";
            this.slaAuthKey += response.body.responseDataHEX.slice(0, -4);
         }else {
            this.slaAuthKey += response.body.responseDataHEX.slice(0, -4);
         }
      }
      //
      self.SCClient.getStatus();
      //
      const ruuid = CUFSmartCardClient.uuidv4();
      //
      const uuid = response.uuid;
      //console.log(`SLAApplication [composeAuthenticateResponse] uuid:`, uuid);
      //
      const signerId = self.SCClient.data.authCertificateSubject.subject.SERIALNUMBER;
      //console.log(`SLAApplication [composeAuthenticateResponse] signerId:`, signerId);
      //
      //let signedXmlDocument = btoa(hextobinary(response.body.responseDataHEX)); // ArrayBuffer
      let signedXmlDocument = btoa(hextobinary(this.slaAuthKey));
      //console.log(`SLAApplication [composeAuthenticateResponse] signXmlDocument:`, signedXmlDocument);
      //
      let userCertificate = btoa(hextobinary(self.SCClient.data.authCertificate));
      //console.log(`SLAApplication [composeAuthenticateResponse] userCertificate:`, userCertificate);
      //
      let subCaCertificate = btoa(hextobinary(self.SCClient.data.issuerCertificate));
      //console.log(`SLAApplication [composeAuthenticateResponse] subCaCertificate:`, subCaCertificate);
      //
      let signCertificate = btoa (hextobinary(self.SCClient.data.signCertificate));
      //
      const appVersion = SLAApplication.instance.SCClient.data.appVersion;
      //console.log(`SLAApplication [composeAuthenticateResponse] appVersion:`, appVersion);
      //console.log(`SLAApplication [composeAuthenticateResponse] programName:`, programName);
   
      let plainXmlDocument;
      plainXmlDocument = self.slaAuthData;

      const responseReturn = {
         uuid,
         ruuid,
         isOk: response.error.code == 'OK',
         appVersion,
         appHostname: "not applied",
         appPort: -1,
         responseType: "auth",
         payload: {
            plainXmlDocument,
            signerId,
            signedXmlDocument,
            userCertificate,
            subCaCertificate,
            signCertificate
         }
      }
      console.log(`SLAApplication [composeAuthenticateResponse] responseReturn:`, responseReturn);
      self.SCClient.clearResults();
      return responseReturn;
   }
}

// Initialize slaApp to be available globally in page scope
const slaApp = new SLAApplication();