const expect = chai.expect;

function asyncGeneratorSupport() {
  try {
    eval(`async function* f(){}`)
  } catch (e) {
    return false;
  }
  return true;
}

function forAwaitSupport() {
  try {
    eval(`async function f() {for await(const i of []){}}`)
  } catch (e) {
    return false;
  }
  return true;
}

(function (karma) {
  const files = Object.keys(karma.files).filter(f => f.endsWith('.test.js'));
  const promises = files.map(js => new Promise(resolve => {
    const s = document.createElement('script');
    s.type = 'module';
    s.src = js;
    s.onload = resolve;
    document.head.appendChild(s);
  }));

  const origLoaded = karma.loaded.bind(karma);
  karma.loaded = _ => {};

  Promise.all(promises)
    .then(_ => {
      origLoaded();
    });
})(__karma__);

// describe('Tasklet Polyfill', function() {
//   beforeEach(function () {
//     Object.assign(this, new MessageChannel());
//   });

//   afterEach(function () {
//   });

//   it('can load an empty tasklet file', async function() {
//   });

//   it('can invoke an exported function', async function() {
//     const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_function.js');
//     expect(await tasklet.simpleFunction()).to.equal(42);
//   });

//   it('can invoke an exported function with parameters', async function() {
//     const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_function.js');
//     expect(await tasklet.concatenatesParameters(1, "asdf")).to.equal("1asdf");
//   });

//   it('can instantiate an exported class', async function() {
//     const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_class.js');
//     const instance = await new tasklet.SimpleClass();
//     expect(instance).to.exist;
//   });

//   it('can invoke methods on an exported class', async function() {
//     const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_class.js');
//     const instance = await new tasklet.SimpleClass();
//     expect(await instance.getAnswer()).to.equal(42);
//   });

//   it('can invoke methods on an instance multiple times even', async function() {
//     const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_class.js');
//     const instance = await new tasklet.SimpleClass();
//     expect(await instance.getAnswer()).to.equal(42);
//     expect(await instance.getAnswer()).to.equal(42);
//     expect(await instance.getAnswer()).to.equal(42);
//   });

//   it('can transfer a buffer', async function() {
//     const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_function.js');
//     const typedArr = new Uint8Array([1, 2, 3]);
//     expect(await tasklet.takesABuffer(typedArr.buffer)).to.equal(3);
//     expect(typedArr.length).to.equal(0);
//   });

//   it('can transfer a nested buffer', async function() {
//     const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_function.js');
//     const typedArr = new Uint8Array([1, 2, 3]);
//     expect(await tasklet.nestedBuffer({a: {b: {c: {buffer: typedArr.buffer}}}})).to.equal(3);
//     expect(typedArr.length).to.equal(0);
//   });

//   it('can transfer a message port', async function() {
//     const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_function.js');
//     const {port1, port2} = new MessageChannel();
//     tasklet.takesAMessagePort(port1);
//     return new Promise(resolve => {
//       port2.onmessage = event => {
//         event.data === 'pong';
//         resolve();
//       };
//     });
//   });

//   it('can transfer a message port from the tasklet', async function() {
//     const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_function.js');
//     const {port} = await tasklet.returnsAMessagePort();
//     expect(port).to.exist;
//   });

//   it('can access properties of instantiated classes', async function() {
//     const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_class.js');
//     const instance = await new tasklet.SimpleClass();
//     expect(await instance._answer).to.equal(42);
//   });

//   it('can access getters of instantiated classes', async function() {
//     const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_class.js');
//     const instance = await new tasklet.SimpleClass();
//     expect(await instance.answerGetter).to.equal(42);
//   });

//   it('can return promises from functions', async function() {
//     const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_function.js');
//     expect(await tasklet.returnsAPromise(42)).to.equal(43);
//   });

//   it('can return promises from instance methods', async function() {
//     const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_class.js');
//     const instance = await new tasklet.SimpleClass();
//     expect(await instance.returnsAPromise(42)).to.equal(43);
//   });

//   it('can return promises from instance properties ', async function() {
//     const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_class.js');
//     const instance = await new tasklet.SimpleClass();
//     expect(await instance.isAPromise).to.equal(42);
//   });

//   it('can return promises from instance getters ', async function() {
//     const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_class.js');
//     const instance = await new tasklet.SimpleClass();
//     expect(await instance.isAPromiseGetter).to.equal(42);
//   });

//   it('allows methods to access instance members', async function() {
//     const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_class.js');
//     const instance = await new tasklet.SimpleClass();
//     expect(await instance.returnsAPropertyValue()).to.equal(42);
//   });

//   it('can access static getters from classes', async function() {
//     const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_class.js');
//     expect(await tasklet.SimpleClass.VERSION).to.equal(42);
//   });

//   it('can access static functions from classes', async function() {
//     const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_class.js');
//     expect(await tasklet.SimpleClass.GetVersion()).to.equal(42);
//   });

//   it('can export objects', async function() {
//     const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_object.js');
//     expect(await tasklet.numberObject.myNumber).to.equal(42);
//   });

//   it('can invoke methods on objects', async function() {
//     const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_object.js');
//     expect(await tasklet.functionObject.myFunction()).to.equal(42);
//   });

//   it('can instantiate classes on objects', async function() {
//     const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_object.js');
//     const instance = await new tasklet.classObject.MyClass();
//     expect(await instance.getNumber()).to.equal(42);
//   });

//   it('can return a proxy object back from a method, and invoke on that proxy', async function() {
//     const tasklet = await tasklets.addModule('/base/tests/fixtures/transfer_proxies.js');
//     const instance = await new tasklet.GetterClass();
//     const proxy = await instance.getTransferProxy();
//     expect(await proxy.method()).to.equal(42);
//   });

//   it('can return a proxy object back from a function, and invoke on that proxy', async function() {
//     const tasklet = await tasklets.addModule('/base/tests/fixtures/transfer_proxies.js');
//     const instance = await new tasklet.returnATransferProxy();
//     expect(await instance.member).to.equal(42);
//   });

//   it('can return a proxy for an object', async function() {
//     const tasklet = await tasklets.addModule('/base/tests/fixtures/transfer_proxies.js');
//     const obj = await new tasklet.returnsATransferProxyForAnObject();
//     expect(await obj.prop).to.equal(4);
//     expect(await obj.func()).to.equal(5);
//   });

//   it('works with worker-side fetches', async function() {
//     const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_function.js');
//     expect(await tasklet.doesAFetch()).to.have.string('Ohai');
//   });

//   if (asyncGeneratorSupport())
//     eval(`
//       it('can invoke an exported generator manually', async function() {
//         const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_function.js');
//         const it = await tasklet.generator();

//         expect(await it.next()).to.deep.equal({value: 1, done: false});
//         expect(await it.next()).to.deep.equal({value: 2, done: false});
//         expect(await it.next()).to.deep.equal({value: 3, done: false});
//         expect(await it.next()).to.deep.equal({value: 4, done: false});
//         expect((await it.next()).done).to.equal(true);
//       });

//       it('can invoke an exported generator manually with values', async function() {
//         const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_function.js');
//         const it = await tasklet.lengthCountingGenerator();

//         await it.next();
//         expect(await it.next('1')).to.deep.equal({value: 1, done: false});
//         expect(await it.next('22')).to.deep.equal({value: 2, done: false});
//         expect(await it.next('333')).to.deep.equal({value: 3, done: false});
//         expect((await it.next('')).done).to.equal(true);
//       });

//       it('can resolve an async iterator that yielded a promise', async function() {
//         const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_function.js');
//         const it = await tasklet.yieldsAPromise();

//         expect(await it.next()).to.deep.equal({value: 42, done: false});
//         expect((await it.next()).done).to.equal(true);
//       });
//     `);

//   if (asyncGeneratorSupport() && forAwaitSupport())
//     eval(`
//       it('can invoke an exported generator with for-await', async function() {
//         const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_function.js');
//         const it = await tasklet.generator();

//         let counter = 1;
//         for await(let i of it) {
//           expect(i).to.equal(counter++);
//         }
//       });

//       it('can invoke an exported generator with for-await without a temp variable', async function() {
//         const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_function.js');

//         let counter = 1;
//         for await(let i of await tasklet.generator()) {
//           expect(i).to.equal(counter++);
//         }
//       });
//     `);
// });
