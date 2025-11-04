// Small smoke module to verify coverage instrumentation
function smoke() {
  // this simple line should be counted by coverage when the function is executed
  return 42;
}

module.exports = {
  smoke,
};
