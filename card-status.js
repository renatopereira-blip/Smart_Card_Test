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
 * @fileoverview VUEJS UI card status component
 * 
 */

const resp = await fetch("ui/components/card-status.html");
const template = await resp.text();

export const CardStatus = {
   template: template,
   data() {
      return {
         cardStatus: this.SCClient.data,
         cardSerial: null,
         publicData: null,
         issuerCertificate: null,
         signatureCertificate: null,
         authenticationCertificate: null,
         isStatusOpen: false
      }
   },
   methods: {
      onSCAPINotification(name, oldValue, newValue) {
         //console.log("CARD STATUS API Notification:", name, newValue);
         if(newValue) {
            switch (name) {
               case "SCClient:statusChanged": {
                  //console.log("CARD STATUS API Notification for status changed:", newValue);
                  this.cardStatus = newValue;
                  if('cardSerial' in newValue) {
                     this.cardSerial = newValue.cardSerial;
                  }
                  if('cardPublicData' in newValue) {
                     this.publicData = newValue.cardPublicDataObject;
                  }
                  if('certificateIssuerSubject' in newValue) {
                     if(newValue.certificateIssuerSubject) {
                        if('issuer' in newValue.certificateIssuerSubject) {
                           this.issuerCertificate = newValue.certificateIssuerSubject.issuer;
                        }
                     }
                  }
                  if('certificateAuthenticationSubject' in newValue) {
                     if(newValue.certificateAuthenticationSubject) {
                        if('subject' in newValue.certificateAuthenticationSubject) {
                           this.authenticationCertificate = newValue.certificateAuthenticationSubject.subject
                        }
                     }
                  }
                  if('certificateSignatureSubject' in newValue) {
                     if(newValue.certificateSignatureSubject) {
                        if('subject' in newValue.certificateSignatureSubject) {
                           this.signatureCertificate = newValue.certificateSignatureSubject.subject
                        }
                     }
                  }
                  break;
               }
               case 'SCClient:cardSerialChanged':
                  if(newValue.cardSerial) {
                     this.cardSerial = newValue.cardSerial;
                  }
                  break;
               case 'SCClient:cardPublicDataObjectChanged':
                  if(newValue.cardPublicDataObject) {
                     this.publicData = newValue.cardPublicDataObject;
                  }
                  break;
               case 'SCClient:certificateIssuerSubjectChanged': {
                  if(newValue.certificateIssuerSubject) {
                     if('issuer' in newValue.certificateIssuerSubject) {
                        this.issuerCertificate = newValue.certificateIssuerSubject.issuer;
                     }
                  }
                  break;
               }
               case 'SCClient:certificateAuthenticationSubjectChanged': {
                  if('certificateAuthenticationSubject' in newValue) {
                     if(newValue.certificateAuthenticationSubject) {
                        if('subject' in newValue.certificateAuthenticationSubject) {
                           this.authenticationCertificate = newValue.certificateAuthenticationSubject.subject
                        }
                     }
                  }
                  break;
               }
               case 'SCClient:certificateSignatureSubjectChanged': {
                  if('certificateSignatureSubject' in newValue) {
                     if(newValue.certificateSignatureSubject) {
                        if('subject' in newValue.certificateSignatureSubject) {
                           this.signatureCertificate = newValue.certificateSignatureSubject.subject
                        }
                     }
                  }
                  break;
               }
               default:
                  break;
            }
         }
      },
      getStatus() {
         //console.log("CARD STATUS Getting card status...");
         this.SCClient.getStatus();
      },
      signInSignature() {
         //console.log("CARD STATUS Signing In (Signature)...");
         this.SCClient.signInSignature();
      },
      signInAuthentication() {
         //console.log("CARD STATUS Signing In (Auth)...");
         this.SCClient.signInAuthentication();
      },
      signOut() {
         //console.log("CARD STATUS Signing Out...");
         this.SCClient.signOut();
      },
      getCardSerial() {
         //console.log("CARD STATUS Get card serial...");
         this.SCClient.read('cardSerial');
      },
      getPublicData() {
         //console.log("CARD STATUS Get public data...");
         this.SCClient.read('publicData');
      },
      getIssuerCertificate() {
         //console.log("CARD STATUS Get issuer certificate...");
         this.SCClient.read('issuerCertificate');
      },
      getAuthenticationCertificate() {
         //console.log("CARD STATUS Get authentication certificate...");
         this.SCClient.read('authCertificate');
      },
      getSignatureCertificate() {
         //console.log("CARD STATUS Get signature certificate...");
         this.SCClient.read('signCertificate');
      },
   },
   mounted() {
      //console.log("CARD STATUS MOUNTED onSCAPINotification:", typeof this.onSCAPINotification);
      this.SCClient.subscribe(this.onSCAPINotification);
   }
}