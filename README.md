# Simple GitHub Action to setup iOS builds securely

This action provides a simple and secure way to setup the GitHub Action enviroment to build an iOS application securely.

It only takes care of the provisioning profile and the keychain. It does not build nor archive the package!

[jose](https://github.com/panva/jose) was used as a JWT provider because it has a smaller dependency tree.

## Example Usage

```
uses: m4c0/gha-simple-ios-setup
with:
  app_store_key_id: ${{secrets.APP_STORE_KEY_ID}}
  app_store_issuer_id: ${{secrets.APP_STORE_ISSUER_ID}}
  app_store_api_key: ${{secrets.APP_STORE_API_KEY}}
  provisioning_profile_id: ${{secrets.PROVISIONING_PROFILE_ID}}
  sign_cert: ${{secrets.SIGN_CERT}}
```

See [Apple's docs](https://developer.apple.com/documentation/appstoreconnectapi/generating_tokens_for_api_requests) for more details about how to obtain those keys
