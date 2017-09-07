const exports = {};

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
