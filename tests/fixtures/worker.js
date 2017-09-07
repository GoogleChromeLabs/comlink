importScripts('/base/tests/prelude.js');
importScripts('/base/comlink.js');
importScripts('/base/tests/postlude.js');

Comlink.expose((a, b) => a + b, self);
