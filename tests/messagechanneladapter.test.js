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

describe('MessageChannelAdapter', function () {
  beforeEach(function () {
    let port1, port2;
    port1 = port2 = {
      get other() {
        if (this === port1)
          return port2;
        else
          return port1;
      },
      send(msg) {
        for(const callback of this.other.callbacks)
          callback({data: msg});
      },
      addEventListener(type, callback) {
        if (type.toLowerCase() !== 'message')
          return;
        this.callbacks.push(callback);
      }
    };
    port1.callbacks = [];
    port2.callbacks = []
    this.port1 = port1;
    this.port2 = port2;
    this.wrappedPort1 = MessageChannelAdapter.wrap(this.port1);
    this.wrappedPort2 = MessageChannelAdapter.wrap(this.port2);
  });

  it('can send messages', function (done) {
    this.wrappedPort2.addEventListener('message', event => {
      expect(event.data).to.equal('ohai');
      done();
    });
    this.wrappedPort2.start();
    this.wrappedPort1.postMessage('ohai');
  });

  it('can send structurally cloneable objects', function (done) {
    const obj = {
      a: {
        b: {
          c: "hai"
        },
        d: true,
      },
      f: 0.2,
    };

    this.wrappedPort2.addEventListener('message', event => {
      expect(event.data).to.deep.equal(obj);
      done();
    });
    this.wrappedPort2.start();
    this.wrappedPort1.postMessage(obj);
  });

  it('can transfer MessagePorts', function (done) {
    let count = 0;
    function inc() {
      count++;
      if (count == 2)
        done();
    }
    const {port1, port2} = new MessageChannel();
    this.wrappedPort2.addEventListener('message', event => {
      if (event.data === 'outer')
        inc();
      else if (event.data.port)
        event.data.port.onmessage = event => {
          if (event.data === 'inner')
            inc();
        };
    });
    this.wrappedPort2.start();
    this.wrappedPort1.postMessage({port: port2}, [port2]);
    port1.postMessage('inner');
    this.wrappedPort1.postMessage('outer');
  });
});
