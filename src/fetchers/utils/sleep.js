/**
 * Sleeper function that allows for adding pauses between function calls if needed
 */
const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

module.exports = sleep;
