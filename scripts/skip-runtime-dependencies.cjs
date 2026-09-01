module.exports = async function skipRuntimeDependencies() {
  // The renderer is fully bundled and the main process uses only Node/Electron built-ins.
  return false;
};
