const startTime = Date.now();

function getRuntime() {
  const diff = Date.now() - startTime;
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return `${hours}h ${minutes}m ${seconds}s`;
}

function getRamUsage() {
  const mem = process.memoryUsage();
  const used = (mem.heapUsed / 1024 / 1024).toFixed(2);
  const total = (mem.heapTotal / 1024 / 1024).toFixed(2);
  return `${used} MB/${total} MB`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeNumber(input) {
  return String(input || "").replace(/\D/g, "");
}

function isGroup(jid) {
  return String(jid || "").endsWith("@g.us");
}

module.exports = {
  getRuntime,
  getRamUsage,
  sleep,
  normalizeNumber,
  isGroup
};
