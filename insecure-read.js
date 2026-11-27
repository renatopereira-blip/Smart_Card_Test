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
 * @fileoverview VUEJS UI InsecureRead component
 * 
 */

const resp = await fetch("ui/insecure-read.html");
const template = await resp.text();

export const InsecureRead = {
   template: template,
   data() {
      return {
         currentEntity: 'InsecureRead',
         entityTitle: 'Insecure Read',
         entityDescription: 'Read plain text public data',
         cardStatus: this.SCClient.data,
      }
   },
}