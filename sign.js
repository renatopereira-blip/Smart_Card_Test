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
 * @fileoverview VUEJS UI Sign component
 * 
 */
import { docXmlToSign } from "../data/doc-xml-to-sign.js";
import { prescription00 } from "../data/prescription-00.js";
import { prescription01 } from "../data/prescription-01.js";
import { prescription02 } from "../data/prescription-02.js";
import { prescription02sign } from "../data/prescription-02_sign.js";
import { prescriptionPDFTeste } from "../data/prescription-pdf.js";
import { smallTextDoc } from "../data/small-text-doc.js";

const resp = await fetch("ui/sign.html");
const template = await resp.text();

export const Sign = {
   template: template,
   data() {
      return {
         currentEntity: 'Sign',
         entityTitle: 'Document Signature',
         entityDescription: 'Sign specific test documents',
         cardStatus: this.SCClient.data,
         selectDoc: 'none',
         selectedDoc: 'no document',
         result: null,
      }
   },
   methods: {
      selectDocChanged() {
         console.log("Select DOC:", this.selectDoc);
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
               break;
            default:
               break;
         }
         this.selectedDoc = document;
      },
      onSCAPINotification(name, oldValue, newValue) {
         console.log(`API Notification for '${name}':`, newValue);
         switch (name) {
            case "currentResultChanged": {
               console.log("SC API Notification for current result changed:", newValue);
               this.result = JSON.stringify(newValue);
               this.selectedDoc = 'document signature can be retrieved';               
               break; 
               break;
            }
            default:
               break;
         }
         // if(newValue) {
         //    if('body' in newValue) {
         //       if(newValue.body.programName == 'signData') {
         //          switch (name) {
         //             case "currentResultChanged":
         //                console.log("SC API Notification for current result changed:", newValue);
         //                this.result = JSON.stringify(newValue);
         //                this.selectedDoc = 'document signature can be retrieved';               
         //                break; 
         //             default:
         //                break;
         //          }
         //       }
         //    }
         // }
      },
      onClickSignBtn() {
         console.log("Sign Button Click");
         this.SCClient.getStatus();
         this.SCClient.sign(this.selectedDoc);
         this.selectedDoc = 'document sent to be signed';
      },
      onClickGetSignatureBtn() {
         console.log("Get Signature Click");
         const currentResult = this.SCClient.getCurrentResult();
         this.currentResult = JSON.stringify(currentResult);
      }
   },
   mounted() {
      console.log("MOUNTED onSCAPINotification sign:", typeof this.onSCAPINotification);
      this.SCClient.subscribe(this.onSCAPINotification);
   }
}