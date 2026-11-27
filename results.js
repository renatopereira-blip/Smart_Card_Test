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
 * @fileoverview VUEJS UI results component
 * 
 */

const resp = await fetch("ui/components/results.html");
const template = await resp.text();

export const Results = {
   emits: ['statusChanged'],
   template: template,
   data() {
      return {
         pastResults: ['no past result available'],
         currentResult: 'no current result available',
         isCurrentResultOpen: false,
         isPastResultsOpen: false,
      }
   },
   methods: {
      onSCAPINotification(name, oldValue, newValue) {
         //console.log("API Notification:", name, newValue);
         switch (name) {
            case "SCClient:pastResultsChanged": {
               //console.log("SC API Notification for past results changed:", newValue);
               this.pastResults = newValue;
               break;
            }
            case "SCClient:currentResultChanged": {
               //console.log("SC API Notification for current result changed:", newValue);
               this.currentResult = newValue;
               break;
            }
            default:
               break;
         }
      },
      getCurrentResult() {
         //console.log("Getting current result...");
         this.SCClient.getCurrentResult();
      },
      getPastResults() {
         //console.log("Getting past results...");
         this.SCClient.getPastResults();
      },
   },
   mounted() {
      console.log("MOUNTED onSCAPINotification:", typeof this.onSCAPINotification);
      this.SCClient.subscribe(this.onSCAPINotification);
   }
}