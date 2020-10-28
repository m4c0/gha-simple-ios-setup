const core = require('@actions/core');
const io = require('@actions/io');

const { pp_folder } = require('./common');

async function run() {
  await io.rmRF(pp_folder);
}

try {
  run().catch(error => core.setFailed(error.message));
} catch (error) {
  core.setFailed(error.message);
}
