const core = require('@actions/core');
const exec = require('@actions/exec');
const io = require('@actions/io');

const { keychain, pp_folder } = require('./common');

async function run() {
  await core.group('Removing provisioning profiles', async () => {
    return await io.rmRF(pp_folder);
  });

  await core.group("Removing keychain", async () => {
    return await exec.exec(`security delete-keychain ${keychain}`);
  });
}

try {
  run().catch(error => core.setFailed(error.message));
} catch (error) {
  core.setFailed(error.message);
}
