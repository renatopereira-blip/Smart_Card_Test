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
 * @fileoverview VUEJS UI Auth component
 *
 */

import { docXmlToSign } from "../data/doc-xml-to-sign.js";
import { prescription00 } from "../data/prescription-00.js";
import { prescription01 } from "../data/prescription-01.js";
import { prescription02 } from "../data/prescription-02.js";
import { prescription02sign } from "../data/prescription-02_sign.js";
import { prescriptionPDFTeste } from "../data/prescription-pdf.js";
import { smallTextDoc } from "../data/small-text-doc.js";
import { multiDoc } from "../data/base64MultipleSign.js";

const resp = await fetch("ui/pem.html");
const template = await resp.text();

export const PEM = {
   template: template,
   data() {
      return {
         currentEntity: 'PEM',
         entityTitle: 'CUF PEM SPMS Test',
         entityDescription: 'Test slaApp implementations which uses CUFSmartCardClient instead of SPMS SLA.',
         cardStatus: this.SCClient.data,
         slaAppNotification: { name: 'empty', newValue: {} },
         isSlaAppNotificationOpen: false,
         slaAppWaitResponse: {},
         isSlaAppWaitResponseOpen: false,
         scAPINotification: { name: 'empty', newValue: {} },
         isScAPINotificationOpen: false,
         mainName: '',
         mainUUID: '',
         isError: false,
         message: '',
         selectDoc: 'none',
         selectedDoc: 'no document',
         result: null,

      }
   },
   methods: {
      onSLAAppNotification(name, oldValue, newValue) {
         //console.log(`slaApp Notification for '${name}' (AUTH):`, newValue);
         const responsesUUID = this.SCClient.responsesUUID;
         //console.log(`slaApp Notification for '${name}' (AUTH) responsesUUID:`, responsesUUID);
         this.slaAppWaitResponse = responsesUUID;
         switch (name) {
            case "slaApp:authenticated":
            case "slaApp:signed":
            case "slaApp:ping":
            case "slaApp:pingUI":
               this.slaAppNotification = { name, newValue };
               break;
            case "SCClient:PublicDataNotAvailable":
               this.isError = true;
               this.message = 'Public Data not available';
               break;
            case "SCClient:UserCertificateNotAvailable":
               this.isError = true;
               this.message = 'User Certificate not available';
               break;
            case "SCClient:CACertificateNotAvailable":
               this.isError = true;
               this.message = 'CA Certificate not available';
               break;
            case "SCClient:CardTypeNotAvailable":
               this.isError = true;
               this.message = 'Card Type  not available';
               break;
            case "SCClient:SignInAuthenticationInitialize":
               this.slaAppNotification = { name, newValue };
               this.mainUUID = newValue.uuid;
               this.mainName = responsesUUID[newValue.uuid].command;
               break;
            case "SCClient:SignPlainDocumentInitializeFail":
               this.isError = true;
               this.message = 'Dados Inválidos da receita.';
               break;
            case "SCClient:SignInSignatureInitialize":
               this.slaAppNotification = { name, newValue };
               this.mainUUID = newValue.uuid;
               this.mainName = responsesUUID[newValue.uuid].command;
               break;
            case "SCClient:SignPlainDocumentInitialize":
               this.slaAppNotification = { name, newValue };
               this.mainUUID = newValue.uuid;
               this.mainName = responsesUUID[newValue.uuid].command;
               break;
            default:
               break;
         }
      },
      onSCAPINotification(name, oldValue, newValue) {
         //console.log(`SCAPI Notification for '${name}' (AUTH):`, newValue);
         this.scAPINotification = { name, newValue };
         const responsesUUID = this.SCClient.responsesUUID;
         //console.log(`slaApp Notification for '${name}' (AUTH) responsesUUID:`, responsesUUID);
         this.slaAppWaitResponse = responsesUUID;
      },
      onClickAuthBtn() {
         //console.log("SIGN AUTH CLICK slaApp:", this.slaApp);
         this.isError = false;
         this.isSlaAppNotificationOpen = true;
         this.isSlaAppWaitResponseOpen = true;
         slaApp.authenticate("this is a test", true, true);
      },
      onClickSignBtn() {
         //console.log("SIGN DOC CLICK slaApp:", this.slaApp);
         this.isError = false;
         this.isSlaAppNotificationOpen = true;
         this.isSlaAppWaitResponseOpen = true;
         const signerId = SCClient.data.signCertificateSubject.subject.SERIALNUMBER;
         //console.log("SIGN DOC CLICK slaApp signerId and selectDoc:", signerId, this.selectDoc);         
         //console.log("SIGN DOC CLICK slaApp signerId and selectedDoc:", signerId, this.selectedDoc);
         const document = this.selectedDoc;
         slaApp.sign(document, signerId, true);
      },
      onClickPingBtn() {
         //console.log("PING CLICK slaApp:", this.slaApp);
         this.isError = false;
         this.isSlaAppNotificationOpen = true;
         this.isSlaAppWaitResponseOpen = true;
         slaApp.ping();
      },
      onClickPingUIBtn() {
         //console.log("PINGUI CLICK slaApp:", this.slaApp);
         this.isError = false;
         this.isSlaAppNotificationOpen = true;
         this.isSlaAppWaitResponseOpen = true;
         slaApp.pingUI();
      },
      selectDocChanged() {
         //console.log("SELECT DOC:", this.selectDoc);
         let document = 'no document';
         switch (this.selectDoc) {
            case "small-text-document":
               document = smallTextDoc;
               break;
            case "doc-xml":
               document = docXmlToSign;
               break;
            case "prescription-00":
               document = prescription00;
               break;
            case "prescription-01":
               document = prescription01;
               break;
            case "prescription-02":
               document = prescription02;
               break;
            case "prescription-02-sign":
               document = prescription02sign;
               break;
            case "prescription-pdf":
               document = prescriptionPDFTeste;
            case "multi-doc":
               document = multiDoc;
               break;
            default:
               break;
         }
         this.selectedDoc = document;
      },
   },
   mounted() {
      // slaApp.init('ZERG','pt', 20);
      // slaApp.subscribe (this.onSCAPINotification);
      // slaApp.ping();
      // console.log("MOUNTED onSCAPINotification sign:", typeof this.onSCAPINotification);
      this.SCClient.subscribe(this.onSCAPINotification);
      this.slaApp.subscribe(this.onSLAAppNotification);
   }
}

