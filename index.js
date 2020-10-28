const core = require('@actions/core');
const exec = require('@actions/exec');
const io = require('@actions/io');

const fs = require('fs');
const https = require('https');
const jose = require('jose');

const { pp_folder } = require('./common');

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
    const req = https.get(`https://api.appstoreconnect.apple.com${uri}`, {
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
  const profile = await get(`/v1/profiles/${pp_id}`);
  const p_uuid = profile.attributes.uuid;
  const p_content_64 = profile.attributes.profileContent;
  const p_content = Buffer.from(p_content_64, 'base64');

  fs.writeFileSync(`${pp_folder}/${p_uuid}.mobileprovision`, p_content);
}

try {
  run().catch(error => core.setFailed(error.message));
} catch (error) {
  core.setFailed(error.message);
}
