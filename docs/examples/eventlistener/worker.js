/**
 * Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// importScripts('https://cdn.jsdelivr.net/npm/comlinkjs/comlink.global.min.js');
importScripts('../../../dist/comlink.global.min.js');
importScripts('event.transferhandler.js');

function eventtarget() {
  const {port1} = new MessageChannel();
  return {
    addEventListener: port1.addEventListener.bind(port1),
    removeEventListener: port1.removeEventListener.bind(port1),
    dispatchEvent: port1.dispatchEvent.bind(port1),
  };
}

const thing = eventtarget();
Comlink.expose(thing, self);

setTimeout(_ => {
  thing.dispatchEvent(new CustomEvent('my-event', {detail: 'This text was put in an event created in a worker'}));
}, 2000);
