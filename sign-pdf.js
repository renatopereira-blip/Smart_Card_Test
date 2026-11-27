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
 * @fileoverview VUEJS UI SignPDF component
 *
 */
import { PDFDocument, PDFName, PDFNumber, PDFString, PDFArray, PDFHexString } from "../libs/sla-api/vendor/pdf-lib.esm.js";
import { preparePdfForSigning, embedCmsIntoPdf, bytesToBase64, buildCMS, embedSignature } from '../libs/sla-api/pdf.js';


const resp = await fetch("ui/sign-pdf.html");
const template = await resp.text();

async function onMessageSignPDF(name, oldValue, newValue) {
   basePDFSign (newValue.payload.signatureValue, newValue.payload.userCertificate, newValue.payload.subCaCertificate);
   return newValue;
};

export const SignPDF = {
   template: template,
   data() {
      return {
         currentEntity: 'SignPDF',
         entityTitle: 'Sign PDF',
         entityDescription: 'Sign a PDF file with the smartcard signature certificate.',
         cardStatus: this.SCClient.data,
         slaAppNotification: { name: 'empty', newValue: {} },
         isSlaAppNotificationOpen: false,
         pdfSignNotification: { name: 'empty', newValue: {} },
         isPdfSignNotificationOpen: false,
         isSigningInProgress: false,
         signedPdfData: null,
         isError: false,
         message: '',
         selectedFile: null,
         fileName: '',
         pdfBase64: null,
         isPdfSignSettingsOpen: false,
         pdfByteRange: null,
         pdfSignSettings: {
            xLocation: '370',
            yLocation: '30',
            height: '120',
            width: '170',
            pageSign: '1',
            multipleSignatures: 'true',
         },
      }
   },
   methods: {
      onSLAAppNotification(name, oldValue, newValue) {
         switch (name) {
            case "slaApp:pdfSigned":
               if (newValue.b64pdf) {
                  this.slaAppNotification = { name, newValue };
                  this.isSlaAppNotificationOpen = true;
                  this.isSigningInProgress = false;

                  // now lets build the necessary data to sign the PDF
                  const cert = newValue.payload.userCertificate;
                  const subCA = newValue.payload.subCaCertificate;
                  const signatureBytes = newValue.payload.signatureValue;
                  const cms = buildCMS([cert, subCA], this.base64ToUint8Array(signatureBytes));
                  const signedPdf = embedSignature(this.pdfBase64, cms);
                  const blob = new Blob([signedPdf], { type: "application/pdf" });
                  const a = Object.assign(document.createElement("a"),
                     { href: URL.createObjectURL(blob), download: "signed.pdf" });
                     a.click();
               }
               break;
            case "SCClient:SignInSignatureInitialize":
               this.slaAppNotification = { name, newValue };
               this.isSlaAppNotificationOpen = true;
               this.isSigningInProgress = true;
               break;
            case "SCClient:SignPlainDocumentInitialize":
               this.slaAppNotification = { name, newValue };
               this.isSlaAppNotificationOpen = true;
               this.isSigningInProgress = true;
               break;
            case "SCClient:SignPlainDocumentInitializeFail":
               this.isError = true;
               this.message = 'Invalid document data.';
               break;
            case "SCClient:UserCertificateNotAvailable":
               this.isError = true;
               this.message = 'User certificate not available.';
               break;
            case "SCClient:CACertificateNotAvailable":
               this.isError = true;
               this.message = 'CA certificate not available.';
               break;
            case "SCClient:CardTypeNotAvailable":
               this.isError = true;
               this.message = 'Card type not available.';
               break;
            case "SCClient:statusChanged":
               if (this.isSigningInProgress) {
                  this.pdfSignNotification = { name, newValue };
                  SCClient.getCurrentResult();
               }
               break;
            default:
               break;
         }
      },
      onFileSelected(event) {
         const file = event.target.files[0];
         if (file) {
            this.selectedFile = file;
            this.fileName = file.name;
            this.pdfBase64 = null;
            this.isError = false;
            this.readFileAsBase64(file).then((b64) => { this.pdfBase64 = b64; });
         }
      },
      async onClickSignBtn() {
         if (!this.selectedFile || !this.pdfBase64) {
            this.isError = true;
            this.message = 'Please select a PDF file.';
            return;
         }
         const signerId = SCClient.data?.signCertificateSubject?.subject?.CN;
         if (!signerId) {
            this.isError = true;
            this.message = 'Signature certificate not available. Please authenticate first (PEM tab).';
            return;
         }
         this.isError = false;
         this.isSlaAppNotificationOpen = false;
         this.isPdfSignNotificationOpen = false;

         const { pdfWithPlaceholder, byteRange, dataToSign } =
            await preparePdfForSigning(this.pdfBase64, {
               text: `Assinado por: ${signerId}`,  // the string shown in the box
               x: this.pdfSignSettings.xLocation,                          // box lower-left X (points, origin bottom-left)
               y: this.pdfSignSettings.yLocation,                          // box lower-left Y
               pageIndex: this.pdfSignSettings.pageSign - 1,               // 0-based page where the box goes
               boxWidth: this.pdfSignSettings.width,
               boxHeight: this.pdfSignSettings.height,
               reason: 'Assinatura digital',
               subFilter: 'adbe.pkcs7.detached', // 'ETSI.CAdES.detached' for PAdES
            });
         
         if (pdfWithPlaceholder && byteRange && dataToSign) {
            this.pdfBase64 = pdfWithPlaceholder;
            this.pdfByteRange = byteRange;
            slaApp.sign(slaApp.wrapInDocumentXML(btoa(this.pdfBase64)), signerId, true);
         } else {
            console.log ("Error!!!!");
         }
      },
      base64ToUint8Array(b64) {
         const binary = atob(b64);
         const bytes = new Uint8Array(binary.length);
         for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
         }
         return bytes;
      },
      uint8ArrayToBase64(bytes) {
         let binary = '';
         for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
         }
         return btoa(binary);
      },
      readFileAsBase64(file) {
         return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
         });
      },
      onSCClientNotification(name, oldValue, newValue) {
         if (name === 'SCClient:currentResultChanged' && this.isSigningInProgress && newValue) {
            this.isSigningInProgress = false;
            this.pdfSignNotification = { name, newValue };
            this.tryDownloadSignedPdf(newValue);
         }
      },
      tryDownloadSignedPdf(currentResult) {
         const hexData = currentResult?.responseDataHEX
            || currentResult?.signedData
            || currentResult?.body?.responseDataHEX
            || currentResult?.body?.signedData;
         const b64Data = currentResult?.signedPdf
            || currentResult?.body?.signedPdf;

         let pdfBytes;
         if (b64Data) {
            pdfBytes = Uint8Array.from(atob(b64Data), (c) => c.charCodeAt(0));
         } else if (hexData && hexData.length > 10) {
            pdfBytes = new Uint8Array(hexData.length / 2);
            for (let i = 0; i < hexData.length; i += 2) {
               pdfBytes[i / 2] = parseInt(hexData.substr(i, 2), 16);
            }
         }

         if (pdfBytes && pdfBytes.length > 4) {
            this.signedPdfData = pdfBytes;
            this.downloadPdfBlob(pdfBytes);
         }
      },
      downloadPdfBlob(bytes) {
         const baseName = this.fileName.replace(/\.pdf$/i, '');
         const blob = new Blob([bytes], { type: 'application/pdf' });
         const url = URL.createObjectURL(blob);
         const a = document.createElement('a');
         a.href = url;
         a.download = `${baseName}_signed.pdf`;
         a.click();
         URL.revokeObjectURL(url);
      },
   },
   mounted() {
      this.slaApp.subscribe(this.onSLAAppNotification);
      SCClient.subscribe(this.onSCClientNotification);
   }
}
