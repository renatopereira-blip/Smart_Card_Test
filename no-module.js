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
 * @fileoverview CUF Smart Card Client API 
 * 
 */

class CUFSmartCardClient {
   /**
    * @member [string] CUF_SMARTCARD_EXTENSION_ID Extension ID from CUF Smartcard Extension
    * This is ID should be unique when in the manifest is declared 
    * the entry 'key' with a public key of the extension.
    */
   CUF_SMARTCARD_EXTENSION_ID = 'lodlbbfpjnfgplpjnjimonfofichokdg';
   /**
    * @member {string} appVersion CUF Smartcard extension version
    */
   appVersion = '0.3.1 beta';
   /**
    * @member {ApplicationReturn} appReturns the application return return from CUF Smartcard Extension
    */
   appReturn;
   /**
    * @member {boolean} isConnected  [true] if smartcard reader is connected
    */
   isConnected = false;
   /**
    * @member {string} cardReaderName  smartcard reader name
    */
   readerName;
   /**
    * @member {boolean} pinInsert pin was inserted now?
    */
   pinInserted;
   /**
    * @member {boolean} pinTimeout timeout pin invalidation 
    */
   pinTimeout;
   /**
    * @member {boolean} pinExpired if pin is expired
    */
   isExpired;
   /** 
    * @member {boolean} isReady [true] if smartcard is inserted
    */
   isReady = false;
   /**
   * @member {string} cardType smartcard type PCC for Portuguese Citizen Card
   * PMAC for Portuguese Medical Association Card
   */
   cardType;
   /** 
    * @member {string} cardSerial card serial number
    */
   cardSerial;
   /**
    * @member {object} publicDataObject Public Data available for Portuguese Citizen Card
    */
   cardPublicDataObject;

/************************************************* */

   /** @member {string} authCertificate */
   authCertificate;

   /** @member {object} authCertificateSubject */
   authCertificateSubject;

   /** @member {string} sighCertificate */
   signCertificate;

   /** @member {object} signCertificateSubject */
   signCertificateSubject;
   
   /** @member {string} issuerCertificate */
   issuerCertificate;

   /** @member {object} issuerCertificateSubject */
   issuerCertificateSubject;

/************************************************* */

   protocolName;
   /**
    * @member {object} currentResult stores current result on demand which mirrors Program state in CUF Smartcard Extension
    */
   currentResult
   /**
    * @member {object} pastResults stores results on demand which mirrors Program state in CUF Smartcard Extension
    */
   pastResults
   /**
    * @member {object} responsesUUID message which requires response this class waits for them to be received
   */
   responsesUUID = {};
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
      console.log("SCClient subscribe:", func);
      CUFSmartCardClient.instance.observers.push(func);
   }

   /**
    * Unsubscribes a function that is registered as an observer
    * 
    * @param {function()} func 
    */
   unsubscribe(func) {
      CUFSmartCardClient.instance.observers = CUFSmartCardClient.instance.observers.filter((observer) => observer !== func);
   }

   /**
    * When data is changed cycle all the subscribe functions and sends what changed the old value and new value
    * 
    * @param {string} name field name that was changed 
    * @param {any} oldValue field old value
    * @param {any} newValue field new value
    */
   notify(name, oldValue, newValue) {
      console.log("OBSERVERS:", CUFSmartCardClient.instance.observers);
      CUFSmartCardClient.instance.observers.forEach((observer) => { if (observer) observer(name, oldValue, newValue) });
   }

   constructor() {
      if (CUFSmartCardClient.instance) {
         return CUFSmartCardClient.instance;
      }

      CUFSmartCardClient.instance = this;

      return this;
   }
  

   get stringify() {
      return JSON.stringify(this.data);
   }

   get data() {
      return {
         appVersion: CUFSmartCardClient.instance.appVersion,
         cardSerial: CUFSmartCardClient.instance.cardSerial,
         pinInserted: CUFSmartCardClient.instance.pinInserted,
         pinTimeout: CUFSmartCardClient.instance.pinTimeout,
         isExpired: CUFSmartCardClient.instance.isExpired,
         cardType: CUFSmartCardClient.instance.cardType,
         cardPublicDataObject: CUFSmartCardClient.instance.cardPublicDataObject,
         authCertificate: CUFSmartCardClient.instance.authCertificate,
         authCertificateSubject: CUFSmartCardClient.instance.authCertificateSubject,
         signCertificate: CUFSmartCardClient.instance.signCertificate,
         signCertificateSubject: CUFSmartCardClient.instance.signCertificateSubject,
         issuerCertificate: CUFSmartCardClient.instance.issuerCertificate,
         issuerCertificateSubject: CUFSmartCardClient.instance.issuerCertificateSubject,       
         isConnected: CUFSmartCardClient.instance.isConnected,
         isReady: CUFSmartCardClient.instance.isReady,
         protocolName: CUFSmartCardClient.instance.protocolName,
         readerName: CUFSmartCardClient.instance.readerName,
      };
   }

   set data(body) {
      const oldData = this.data;
      //
      let oldValue = CUFSmartCardClient.instance.appVersion;
      let newValue = body.appVersion;
      if (oldValue != newValue) {
         CUFSmartCardClient.instance.appVersion = newValue;
         this.notify("SCClient:appVersionChanged", oldValue, newValue);
      }
      //
      oldValue = CUFSmartCardClient.instance.cardSerial;
      newValue = body.cardSerial;
      if (oldValue != newValue) {
         CUFSmartCardClient.instance.cardSerial = newValue;
         this.notify("SCClient:cardSerialChanged", oldValue, newValue);
      }
      //
      oldValue = CUFSmartCardClient.instance.pinInserted;
      newValue = body.pinInserted;
      if (oldValue != newValue) {
         CUFSmartCardClient.instance.pinInserted = body.pinInserted;
         this.notify("SCClient:pinInsertedChanged", oldValue, newValue);
      }
      //
      oldValue = CUFSmartCardClient.instance.pinTimeout;
      newValue = body.pinTimeout;
      if (oldValue != newValue) {
         CUFSmartCardClient.instance.pinTimeout = body.pinTimeout;
         this.notify("SCClient:pinTimeoutChanged", oldValue, newValue);
      }
      //
      oldValue = CUFSmartCardClient.instance.isExpired;
      newValue = body.isExpired;
      if (oldValue != newValue) {
         CUFSmartCardClient.instance.isExpired = body.isExpired;
         this.notify("SCClient:isExpiredChanged", oldValue, newValue);
      }
      //
      oldValue = CUFSmartCardClient.instance.cardType;
      newValue = body.cardType;
      if (oldValue != newValue) {
         CUFSmartCardClient.instance.cardType = body.cardType;
         this.notify("SCClient:cardTypeChanged", oldValue, newValue);
      }
      //
      oldValue = CUFSmartCardClient.instance.cardPublicDataObject;
      newValue = body.cardPublicDataObject;
      if (oldValue != newValue) {
         CUFSmartCardClient.instance.cardPublicDataObject = body.cardPublicDataObject;
         this.notify("SCClient:cardPublicDataObjectChanged", oldValue, newValue);
      }

/******************************************* */
      //
      oldValue = CUFSmartCardClient.instance.authCertificate;
      newValue = body.authCertificate;
      if (oldValue != newValue) {
         CUFSmartCardClient.instance.authCertificate = body.authCertificate;
         CUFSmartCardClient.instance.notify("SCClient:authCertificateChanged", oldValue, newValue);
      }
      oldValue = CUFSmartCardClient.instance.authCertificateSubject;
      newValue = body.authCertificateSubject;
      if (oldValue != newValue) {
         CUFSmartCardClient.instance.authCertificateSubject = body.authCertificateSubject;
         CUFSmartCardClient.instance.notify("SCClient:authCertificateSubjectChanged", oldValue, newValue);
      }
      //
      oldValue = CUFSmartCardClient.instance.signCertificate;
      newValue = body.signCertificate;
      if (oldValue != newValue) {
         CUFSmartCardClient.instance.signCertificate = body.signCertificate;
         CUFSmartCardClient.instance.notify("SCClient:signCertificateChanged", oldValue, newValue);
      }
      oldValue = CUFSmartCardClient.instance.signCertificateSubject;
      newValue = body.signCertificateSubject;
      if (oldValue != newValue) {
         CUFSmartCardClient.instance.signCertificateSubject = body.signCertificateSubject;
         CUFSmartCardClient.instance.notify("SCClient:signCertificateSubjectChanged", oldValue, newValue);
      }
      //
      oldValue = CUFSmartCardClient.instance.issuerCertificate;
      newValue = body.issuerCertificate;
      if (oldValue != newValue) {
         CUFSmartCardClient.instance.issuerCertificate = body.issuerCertificate;
         CUFSmartCardClient.instance.notify("SCClient:issuerCertificateChanged", oldValue, newValue);
      }
      //
      oldValue = CUFSmartCardClient.instance.issuerCertificateSubject;
      newValue = body.issuerCertificateSubject;
      if (oldValue != newValue) {
         CUFSmartCardClient.instance.issuerCertificateSubject = body.issuerCertificateSubject;
         CUFSmartCardClient.instance.notify("SCClient:issuerCertificateSubjectChanged", oldValue, newValue);
      }

/******************************************* */

      //
      oldValue = CUFSmartCardClient.instance.isConnected;
      newValue = body.isConnected;
      if (oldValue != newValue) {
         CUFSmartCardClient.instance.isConnected = body.isConnected;
         this.notify("SCClient:isConnectedChanged", oldValue, newValue);
      }
      //
      oldValue = CUFSmartCardClient.instance.isReady;
      newValue = body.isReady;
      if (oldValue != newValue) {
         CUFSmartCardClient.instance.isReady = body.isReady;
         this.notify("SCClient:isReadyChanged", oldValue, newValue);
      }
      //
      oldValue = CUFSmartCardClient.instance.protocolName;
      newValue = body.protocolName;
      if (oldValue != newValue) {
         CUFSmartCardClient.instance.protocolName = body.protocolName;
         this.notify("SCClient:protocolNameChanged", oldValue, newValue);
      }
      //
      oldValue = CUFSmartCardClient.instance.readerName;
      newValue = body.readerName;
      if (oldValue != newValue) {
         CUFSmartCardClient.instance.readerName = body.readerName;
         this.notify("SCClient:readerNameChanged", oldValue, newValue);
      }
      const newData = this.data;
      this.notify("SCClient:statusChanged", oldData, newData);
   }

   get pastResults() {
      return CUFSmartCardClient.instance.pastResults;
   }

   set pastResults(results) {
      const oldValue = CUFSmartCardClient.instance.pastResults;
      CUFSmartCardClient.instance.pastResults = results;
      const newValue = CUFSmartCardClient.instance.pastResults;
      this.notify("SCClient:pastResultsChanged", oldValue, newValue);
   }

   get currentResult() {
      return CUFSmartCardClient.instance.currentResult;
   }

   set currentResult(result) {
      const oldValue = CUFSmartCardClient.instance.currentResult;
      CUFSmartCardClient.instance.currentResult = result;
      const newValue = CUFSmartCardClient.instance.currentResult;
      this.notify("SCClient:currentResultChanged", oldValue, newValue);
   }

   /**
    * Reset data locally
    */
   reset() {
      const oldValue = this.data;
      CUFSmartCardClient.instance.cardType = undefined;
      CUFSmartCardClient.instance.cardSerial = undefined;
      CUFSmartCardClient.instance.cardPublicDataObject = undefined;
      CUFSmartCardClient.instance.authCertificate = undefined;
      CUFSmartCardClient.instance.signCertificate = undefined;
      CUFSmartCardClient.instance.authCertificateSubject = undefined;
      CUFSmartCardClient.instance.signCertificateSubject = undefined;
      CUFSmartCardClient.instance.issuerCertificate = undefined;
      CUFSmartCardClient.instance.issuerCertificateSubject = undefined;
      CUFSmartCardClient.instance.protocolName = undefined;
      CUFSmartCardClient.instance.isReady = false;
      CUFSmartCardClient.instance.isConnected = false;
      const newValue = this.data;
      this.notify("SCClient:reset", oldValue, newValue);
   }

   /**
    * Initialize extensions
    */
   initialize() {
      console.log("API:Initialize smart card");
      chrome.runtime.sendMessage(CUFSmartCardClient.instance.CUF_SMARTCARD_EXTENSION_ID, {
         "command": "initialize",
         "body": {},
         uuid: CUFSmartCardClient.uuidv4()
      }, function (response) {
         console.log("Response:", response);
         if (response) {
            console.log("Got response...");
            if (response.succeed) {
               console.log("API: Response succeed:", response.body);
               SCClient.data = response.body;
            } else {
               console.warn("Response Failed:", response.error);
               SCClient.reset();
               SCClient.appReturn = response.error;
            }
         } else {
            console.warn("Failed to get response:", response);
            SCClient.reset();
            SCClient.appReturn = {
               code: "P000",
               message: "Response 'undefined'",
            }
         }
      });
   }

   /**
    * Get available data from extension
    */
   getStatus() {
      console.log("API: Getting card status...");
      chrome.runtime.sendMessage(CUFSmartCardClient.instance.CUF_SMARTCARD_EXTENSION_ID, {
         "command": "getStatus",
         "body": {},
         uuid: CUFSmartCardClient.uuidv4()
      }, function (response) {
         console.log("API: Response:", response);
         if (response) {
            console.log("Got response...");
            if (response.succeed) {
               console.log("API: Response succeed:", response.body);
               SCClient.data = response.body;
            } else {
               console.warn("Response Failed:", response.error);
               SCClient.reset();
               SCClient.appReturn = response.error;
            }
         } else {
            console.warn("Failed to get response:", response);
            SCClient.reset();
            SCClient.appReturn = {
               code: "P000",
               message: "Response 'undefined'",
            }
         }
      });
   }

   /**
    * Sign OUT and reset extension data
    */
   signOut() {
      console.log("API: Sign out...");
      chrome.runtime.sendMessage(CUFSmartCardClient.instance.CUF_SMARTCARD_EXTENSION_ID, {
         "command": "signout",
         "body": {},
         uuid: CUFSmartCardClient.uuidv4()
      }, function (response) {
         console.log("Response:", response);
         if (response) {
            console.log("SIGNOUT: Got response...");
            if (response.succeed) {
               console.log("API: Response succeed:", response.body);
               SCClient.data = response.body;
            } else {
               console.warn("SIGNOUT: Response Failed:", response.error);
               SCClient.reset();
               SCClient.appReturn = response.error;
            }
         } else {
            console.warn("SIGNOUT: Failed to get response:", response);
            this.reset()
            SCClient.appReturn = {
               code: "P000",
               message: "Response 'undefined'",
            }
         }
      });
   }

   /**
    * Allows to be invoked signin with signature pin code 
    * with a payload that will be attached to response.
    * This method adds a UUID to identify the response accordingly.
    * 
    * @param {*} payload if sign in requires some data to be validated
    * @param {string} responseUUID Universal unique identifier for the message 
    */
   signInSignature(payload, responseUUID) {
      console.log("SIGNIN SIGN API: Sign in signature...");
      let body = {};
      let uuid = CUFSmartCardClient.uuidv4();
      if (responseUUID) {
         uuid = responseUUID;
         body['responseUUID'] = uuid;
      }
      if (payload) {
         body = payload;
      }
      const msg = {
         "command": "signinSignature",
         body,
         uuid
      }
      CUFSmartCardClient.instance.responsesUUID[uuid] = msg
      console.log("SIGNIN SIGN API: Sign in (Signature):", msg);

      chrome.runtime.sendMessage(CUFSmartCardClient.instance.CUF_SMARTCARD_EXTENSION_ID, msg, function (response) {
         console.log("SIGNIN SIGN API: Response:", response);
         if (response) {
            console.log("SIGNIN SIGN API: Got response...");
            if (response.succeed) {
               console.log("API: Response succeed:", response.body);
               SCClient.data = response.body;
            } else {
               console.warn("SIGNIN SIGN API: Response Failed:", response.error);
               SCClient.reset();
               SCClient.appReturn = response.error;
            }
         } else {
            console.warn("SIGNIN SIGN API: Failed to get response:", response);
            this.reset()
            SCClient.appReturn = {
               code: "P000",
               message: "Response 'undefined'",
            }
         }
      });
   }

   /**
    * Allows to be invoked signin with authentication pin code 
    * with a payload that will be attached to response.
    * This method adds a UUID to identify the response accordingly.
    * 
    * @param {*} payload if sign in requires some data to be validated
    * @param {string} responseUUID Universal unique identifier for the message 
    */
   signInAuthentication(payload, responseUUID) {
      console.log("SIGNIN AUTH API: Sign in authentication...");
      let body = {};
      let uuid = CUFSmartCardClient.uuidv4();
      if (responseUUID) {
         uuid = responseUUID;
         body['responseUUID'] = uuid;
      }
      if (payload) {
         if ('dataToBeSign' in payload) {
            body['dataToBeSign'] = payload.dataToBeSign;
         };
         if ('plainData' in payload) {
            body['plainData'] = payload.plainData;
         };
         if ('triggerAskPin' in payload) {
            body['triggerAskPin'] = payload.triggerUi;
         };
         if ('forceAuth' in payload) {
            body['forceAuth'] = payload.forceAuth;
         };
      }
      const msg = {
         command: "signinAuthentication",
         body,
         uuid
      }
      CUFSmartCardClient.instance.responsesUUID[uuid] = msg
      console.log("SIGNIN AUTH API: Sign in (Authentication)", msg);

      chrome.runtime.sendMessage(CUFSmartCardClient.instance.CUF_SMARTCARD_EXTENSION_ID, msg, function (response) {
         console.log("Response:", response);
         if (response) {
            console.log("SIGNIN AUTH API: Got response...");
            if (response.succeed) {
               console.log("SIGNIN AUTH API: Response succeed:", response.body);
               SCClient.data = response.body;
            } else {
               console.warn("SIGNIN AUTH API: Response Failed:", response.error);
               SCClient.reset();
               SCClient.appReturn = response.error;
            }
         } else {
            console.warn("SIGNIN AUTH API: Failed to get response:", response);
            this.reset()
            SCClient.appReturn = {
               code: "P000",
               message: "Response 'undefined'",
            }
         }
      });
   }

   /**
    * 
    * @param {string} dataType The type data to be read one of ['card-serial', 'public-data', 'authCertificate', 'signCertificate', 'issuerCertificate']
    */
   read(dataType) {
      console.log("API: read data...");
      let command = 'card-serial';
      switch (dataType) {
         case "public-data":
            command = 'getPublicData';
            break;
         case "card-serial":
            command = 'getCardSerial';
            break;
         case "issuerCertificate":
            command = 'getIssuerCertificate';
            break;
         case "signCertificate":
            command = 'getSignCertificate';
            break;
         case "authCertificate": 
            command = "getAuthCertificate";
            break;
         default:
            console.warn(`'${dataType}' is an invalid read!`);
            break;
      }
      chrome.runtime.sendMessage(CUFSmartCardClient.instance.CUF_SMARTCARD_EXTENSION_ID, {
         command,
         body: {},
         uuid: CUFSmartCardClient.uuidv4()
      }, function (response) {
         console.log("Response:", response);
         if (response) {
            console.log("READ: Got response...");
            if (response.succeed) {
               console.log("API: Response succeed:", response.body);
               SCClient.data = response.body;
            } else {
               console.warn("READ: Response Failed:", response.error);
               SCClient.reset();
               SCClient.appReturn = response.error;
            }
         } else {
            console.warn("READ: Failed to get response:", response);
            SCClient.reset();
            SCClient.appReturn = {
               code: "P000",
               message: "Response 'undefined'",
            }
         }
      });
   }

   /**
    * Sign a PDF file and imprint a seal image.
    * This method adds a UUID to identify the response accordingly.
    * ===== PARTIAL IMPLEMENTATION =====
     * 
    * @param {string} dataToBeSign The data to be signed in Base64 encode
    * @param {string} signerId is user certificate serial number
    * @param {string} pdfSignSettings sign stamp location inside PDF
    * @param {string} responseUUID Universal unique identifier for the message 
    * @param {boolean} askSignaturePinCode if true extension will trigger signature pin code input dialog default is true.
    */
   signPDFWithSignature(dataToBeSign, signerId, pdfSignSettings, responseUUID, askSignaturePinCode = true) {
      console.log("API: sign PDF with signature...");
      let uuid = CUFSmartCardClient.uuidv4();
      if (responseUUID) {
         uuid = responseUUID;
      }
      const body = {
         dataToBeSign,
         signerId,
         pdfSignSettings,
         askSignaturePinCode,
         responseUUID: uuid
      }
      const msg = {
         body,
         uuid
      }
      CUFSmartCardClient.instance.responsesUUID[uuid] = msg
      console.log("API: Sign PDF Document", msg);

      chrome.runtime.sendMessage(CUFSmartCardClient.instance.CUF_SMARTCARD_EXTENSION_ID, msg, function (response) {
         console.log("Response:", response);
         if (response) {
            console.log("SIGN DOCUMENT: Got response...");
            if (response.succeed) {
               console.log("API: Response succeed:", response.body);
               SCClient.data = response.body;
            } else {
               console.warn("SIGN DOCUMENT: Response Failed:", response.error);
               SCClient.reset();
               SCClient.appReturn = response.error;
            }
         } else {
            console.warn("SIGN DOCUMENT: Failed to get response:", response);
            SCClient.reset();
            SCClient.appReturn = {
               code: "P000",
               message: "Response 'undefined'",
            }
         }
      });
   }

   /**
    * Sign with signature pin code plain data in Base64.
    * This method adds a UUID to identify the response accordingly.
    * 
    * @param {string} dataToBeSign The data to be signed in Base64 encode
    * @param {string} signerId is user certificate serial number
    * @param {string} responseUUID Universal unique identifier for the message 
    * @param {boolean} askSignaturePinCode if true extension will trigger signature pin code input dialog default is true.
    */
   signWithSignature(dataToBeSign, signerId, responseUUID, askSignaturePinCode = true) {
      console.log("API: sign with signature...");
      let uuid = CUFSmartCardClient.uuidv4();
      if (responseUUID) {
         uuid = responseUUID;
      }
      const body = {
         dataToBeSign,
         signerId,
         askSignaturePinCode,
         responseUUID: uuid,
      }
      const msg = {
         "command": "signData", //  signDataSignature
         body,
         uuid
      }
      CUFSmartCardClient.instance.responsesUUID[uuid] = msg
      console.log("API: Sign Plain Text Document (Signature)", msg);

      chrome.runtime.sendMessage(CUFSmartCardClient.instance.CUF_SMARTCARD_EXTENSION_ID, msg, function (response) {
         console.log("Response:", response);
         if (response) {
            console.log("SIGN PLAIN DOCUMENT (Signature): Got response...");
            if (response.succeed) {
               console.log("API: Response succeed (Signature):", response.body);
               SCClient.data = response.body;
            } else {
               console.warn("SIGN PLAIN DOCUMENT (Signature): Response Failed:", response.error);
               SCClient.reset();
               SCClient.appReturn = response.error;
            }
         } else {
            console.warn("SIGN PLAIN DOCUMENT (Signature): Failed to get response:", response);
            this.reset()
            SCClient.appReturn = {
               code: "P000",
               message: "Response 'undefined'",
            }
         }
      });
   }

   /**
    * Sign with authentication pin code plain data in Base64.
    * This method adds a UUID to identify the response accordingly.
    * 
    * @param {string} dataToBeSign The data to be signed in Base64 encode
    * @param {string} signerId is user certificate serial number
    * @param {string} responseUUID Universal unique identifier for the message 
    * @param {boolean} askSignaturePinCode if true extension will trigger signature pin code input dialog default is true.
    */
   signWithAuthentication(dataToBeSign, signerId, responseUUID, askAuthenticationPinCode = true) {
      console.log("API: sign with authentication...");
      let uuid = CUFSmartCardClient.uuidv4();
      if (responseUUID) {
         uuid = responseUUID;
      }
      const body = {
         dataToBeSign,
         signerId,
         askAuthenticationPinCode,
         responseUUID: uuid
      }

      const msg = {
         "command": "signDataAuthentication",
         body,
         uuid
      }
      CUFSmartCardClient.instance.responsesUUID[uuid] = msg
      console.log("API: Sign Plain Text Document (Authentication)", msg);

      chrome.runtime.sendMessage(CUFSmartCardClient.instance.CUF_SMARTCARD_EXTENSION_ID, msg, function (response) {
         console.log("Response:", response);
         if (response) {
            console.log("SIGN PLAIN DOCUMENT (Authentication): Got response...");
            if (response.succeed) {
               console.log("API: Response succeed (Authentication):", response.body);
               SCClient.data = response.body;
            } else {
               console.warn("SIGN PLAIN DOCUMENT (Authentication): Response Failed:", response.error);
               SCClient.reset();
               SCClient.appReturn = response.error;
            }
         } else {
            console.warn("SIGN PLAIN DOCUMENT (Authentication): Failed to get response:", response);
            this.reset()
            SCClient.appReturn = {
               code: "P000",
               message: "Response 'undefined'",
            }
         }
      });
   }

   /**
    * Removes UUID from response wait list
    * 
    * @param {string} uuid 
    */
   removeFromWaitResponseList(uuid) {
      console.log(`API: Remove '${uuid}' from response wait list`);
      delete CUFSmartCardClient.instance.responsesUUID[uuid];
   }

   scanResults() {
      console.log("API: Scanning Results activated");
      const pastResults = CUFSmartCardClient.instance.pastResults;
      for (const [uuid, payload] of Object.entries(CUFSmartCardClient.instance.responsesUUID)) {
         console.log(`API: Scanning for Results activated for [${uuid}] payload`, payload);
         console.log(`API: Scanning for Results activated for [${uuid}] responsesUUID`, CUFSmartCardClient.instance.responsesUUID);
         console.log(`API: Scanning for Results activated for [${uuid}] pastResults`, pastResults);
         if (pastResults) {
            const found = pastResults.filter((item) => item.uuid == uuid);
            // {
            //    if (item != null) {
            //       if(item.uuid == uuid) {
            //          console.log(`API: Scan past results for [${uuid}]`, item);
            //          return item.uuid == uuid;
            //       }
            //    }
            // });
            if (found) {
               console.log(`API: Scanning for Results activated for [${uuid}] FOUND!`, found);
               for (const item of found) {
                  SCClient.notify('gotResponse', uuid, item);
               }
               SCClient.removeFromWaitResponseList(uuid);
            }
         }
         // const found = pastResults.filter((item) => item.uuid == uuid);
         // console.log(`API: Wait for Results activated for [${uuid}] found:`, payload);
         // if (found) {
         //    console.log(`API: Wait for Results activated for ${uuid} FOUND!`);
         //    SCClient.removeFromWaitResponseList(uuid);
         //    SCClient.notify('gotResponse', uuid, payload);
         // }
      }
   }

   /**
    * Cron alike which execute and check past results with a specific UUID,
    * when found will notify subscribers with 'gotResponse' event
    * 
    * @param {number} interval in seconds
    */
   waitForResults(interval = 5) {
      console.log(`API: Scanning Results activated for ${interval}s interval!`);
      setInterval(this.scanResults(), interval * 1000);
   }

   /**
    * Get the past results from issued commands
    */
   getPastResults() {
      console.log("API: Get Past Results...");
      chrome.runtime.sendMessage(CUFSmartCardClient.instance.CUF_SMARTCARD_EXTENSION_ID, {
         "command": "getPastResults",
         "body": {},
         uuid: CUFSmartCardClient.uuidv4()
      }, function (response) {
         console.log("Response:", response);
         if (response) {
            console.log("GET PAST RESULTS: Got response...");
            if (response.succeed) {
               console.log("API: Response succeed:", response.body);
               if ('pastResults' in response.body) {
                  SCClient.pastResults = response.body.pastResults;
               }
            } else {
               console.warn("GET PAST RESULTS: Response Failed:", response.error);
               SCClient.reset();
               SCClient.appReturn = response.error;
            }
         } else {
            console.warn("GET PAST RESULTS: Failed to get response:", response);
            this.reset()
            SCClient.appReturn = {
               code: "P000",
               message: "Response 'undefined'",
            }
         }
      });
   }

   /**
    * Get the current result (last result) of the last command issued
    */
   getCurrentResult() {
      console.log("API: Get Current Result...");
      chrome.runtime.sendMessage(CUFSmartCardClient.instance.CUF_SMARTCARD_EXTENSION_ID, {
         command: "getCurrentResult",
         body: {},
         uuid: CUFSmartCardClient.uuidv4()
      }, function (response) {
         console.log("Response:", response);
         if (response) {
            console.log("GET CURRENT RESULT: Got response...");
            if (response.succeed) {
               console.log("API: Response succeed:", response.body);
               SCClient.currentResult = response.body.currentResult;
            } else {
               console.warn("GET CURRENT RESULT: Response Failed:", response.error);
               SCClient.reset();
               SCClient.appReturn = response.error;
            }
         } else {
            console.warn("GET CURRENT RESULT: Failed to get response:", response);
            this.reset()
            SCClient.appReturn = {
               code: "P000",
               message: "Response 'undefined'",
            }
         }
      });
   }

   /**
    * Utility method Generates an UUID
    * 
    * @returns UUID
    */
   static uuidv4() {
      return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
         (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
      );
   }

}

/**
 * @instance Of CUFSmartCardClient instance on start to be used inside operations.
 */
const SCClient = new CUFSmartCardClient();
setInterval(SCClient.scanResults(), 5000);