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
 * @fileoverview VUEJS UI Home component
 * 
 */

// const template = `
// <h1 class="title">Home Page</h1>
// `;

const resp = await fetch("ui/home.html");
const template = await resp.text();

export const Home = {
   template: template,
   data() {
      return {
         currentEntity: 'Home',
         entityTitle: 'CUF Smartcard Client APITest',
         entityDescription: 'Testing tool to use ChromeOS CUF Smartcard API',
         entityDetailDescription: 'This application allows to test secure digital signatures for wealth professionals with a Portuguese Citizen Card or Portuguese Medical Association Card.',
         cardStatus: this.SCClient.data,
      }
   },
}

