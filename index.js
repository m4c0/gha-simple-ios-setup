const core = require('@actions/core');
const exec = require('@actions/exec');
const io = require('@actions/io');

const fs = require('fs');
const https = require('https');
const jose = require('jose');

const { keychain, pp_folder } = require('./common');

async function run() {
  await core.group('Creating provision profile folder', async () => {
    return await io.mkdirP(pp_folder)
  });

  core.info('Downloading provision profile');

  // https://developer.apple.com/documentation/appstoreconnectapi/generating_tokens_for_api_requests
  const kid = core.getInput('app_store_key_id');
  const iss = core.getInput('app_store_issuer_id');
  const key = core.getInput('app_store_api_key');

  const jwk = jose.JWK.asKey(key);
  const token = jose.JWT.sign({}, key, {
    algorithm: 'ES256',
    audience: 'appstoreconnect-v1',
    expiresIn: '1 min',
    header: { kid: kid },
    issuer: iss,
    kid: false,
  });
  const get = uri => new Promise((resolve, reject) => {
    const req = https.get(uri, {
      headers: { Authorization: `Bearer ${token}` }
    }, resp => {
      if (resp.statusCode / 100 != 2) {
        reject(new Error(`Failed to load page: ${resp.statusMessage}`));
      }
      const body = [];
      resp.on('data', chunk => body.push(chunk));
      resp.on('end', () => resolve(JSON.parse(body.join('')).data));
    });
    req.on('error', err => reject(err));
  });

  const pp_id = core.getInput('provisioning_profile_id');
  const profile = await get(`https://api.appstoreconnect.apple.com/v1/profiles/${pp_id}`);
  const bundle = await get(profile.relationships.bundleId.links.related);
  const certs = await get(profile.relationships.certificates.links.related);
  const p_uuid = profile.attributes.uuid;
  const p_content_64 = profile.attributes.profileContent;
  const p_content = Buffer.from(p_content_64, 'base64');

  core.setOutput('provisioning_profile_uuid', p_uuid);
  core.setSecret('provisioning_profile_uuid');

  core.setOutput('team_id', bundle.attributes.seedId);
  core.setSecret('team_id');

  core.setOutput('certificates', certs.map(x => x.attributes.name));
  core.setSecret('certificates');

  fs.writeFileSync(`${pp_folder}/${p_uuid}.mobileprovision`, p_content);

  await core.group("Creating keychain", async () => {
    return await exec.exec('security', ['create-keychain', '-p', '', keychain]);
  });
  await core.group("Storing sign certificate", async () => {
    const p12_b64 = core.getInput('sign_cert');
    const p12 = Buffer.from(p12_b64, 'base64');
    fs.writeFileSync('cert.p12', p12);
    const res = await exec.exec('security', [
      'import', 'cert.p12',
      '-t', 'agg',
      '-k', keychain,
      '-P', '',
      '-A',
    ]);
    fs.unlinkSync('cert.p12');
    return res;
  });
  await core.group("Setting keychain search list", async () => {
    return await exec.exec(`security list-keychains -s ${keychain}`);
  });
  await core.group("Setting default keychain", async () => {
    return await exec.exec(`security default-keychain -s ${keychain}`);
  });
  await core.group("Unlocking keychain", async () => {
    return await exec.exec('security', ['unlock-keychain', '-p', '', keychain]);
  });
  await core.group("Setting keychain key partition", async () => {
    return await exec.exec('security', [
      'set-key-partition-list',
      '-S', 'apple-tool:,apple:',
      '-s', '-k', '',
      keychain
    ]);
  });
}

try {
  run().catch(error => core.setFailed(error.message));
} catch (error) {
  core.setFailed(error.message);
}
