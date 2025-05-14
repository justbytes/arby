const MIN_TICK = -887272;
const MAX_TICK = 887272;

const tickToPrice = (tick) => {
  return Math.pow(1.0001, tick);
};

const getLowerTick = (currentTick, tickSpacing) => {
  if (currentTick < MIN_TICK || currentTick > MAX_TICK) {
    throw new Error("Tick out of range");
  }

  let remainder = currentTick % tickSpacing;
  if (remainder < 0) remainder += tickSpacing;
  return currentTick - remainder;
};

const getUpperTick = (currentTick, tickSpacing) => {
  if (currentTick < MIN_TICK || currentTick > MAX_TICK) {
    throw new Error("Tick out of range");
  }

  let remainder = currentTick % tickSpacing;
  if (remainder > 0) remainder -= tickSpacing;
};

module.exports = { tickToPrice, getLowerTick, getUpperTick };
