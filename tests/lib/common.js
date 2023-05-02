
/**
 * Pretty formatter for test log messages
 * @param {string} prefix 
 * @returns anonymous function that returns a string
 */
function testLog(prefix) {
  return (message, section="") => {
    return (section) ? `${prefix} (${section}): ${message}` : `${prefix}: ${message}`;
  }
}

module.exports = {
  testLog: testLog
}