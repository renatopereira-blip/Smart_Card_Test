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
 * @fileoverview VUEJS UI Overview component
 * 
 */

const resp = await fetch("ui/overview.html");
const template = await resp.text();

export const Overview = {
   template: template,
   data() {
      return {
         currentEntity: 'Overview',
         entityTitle: 'Overview',
         entityDescription: 'This section allows to test and get card reader status and card inserted',
         cardStatus: this.SCClient.data,
         isAuthCertStatusOpen: false,
         isSignCertStatusOpen: false,
         isIssuerCertStatusOpen: false,
         iscardStatusOpen: false,
         isPublicDataOpen: false,
         cardType: ''
      }
   },
   methods: {
      updateStatus(data) {
         console.log("OVERVIEW receiveEmit:", data);
         this.cardStatus = data;
      },
      onSCAPINotification(name, oldValue, newValue) {
         if(newValue) {
            switch (name) {
               case "SCClient:statusChanged": {
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
               case 'SCClient:cardTypeChanged':{
                  if(newValue){
                     this.cardType =  newValue;
                  }
                  break;
               }
               default:
                  break;
            }
         }
      },
   },
   mounted() {
      this.SCClient.subscribe(this.onSCAPINotification);
      this.updateStatus(this.SCClient.data);
   }
}