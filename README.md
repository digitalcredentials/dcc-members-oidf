# dcc-members-oidf

## Description:

A pilot implementation of an issuer registry for learning and employment credentials, using the [OpenID Federation](https://openid.net/specs/openid-federation-1_0.html) specification.

## Dependencies:

sqlite3, express, jose

## Key commands:

1. Create/recreate DB schema: `npm run builddb`
2. Load/reload test data into DB: `npm run loadtestdata`
3. Generate server keys (HTTPS): `npm run keygen`
4. Launch webservice: `npm run webservice`
5. Test endpoint(s): `curl -X GET http://localhost:3000/{{TRUST_ANCHOR_NAME}}/.well-known/openid-federation` e.g. `curl -X GET https://localhost:3000/issuer-registry/.well-known/openid-federation`. Also see `tests/DCC_OIDF.postman_collection.json` for a suite of Postman tests.

## Ancillary scripts

- Generate a sample set of ECDSA private and public keys: `./scripts/generate_ecdsa_keys.sh`
- Check to see if a sample set of ECDSA private and public keys are valid: `python3 ./test.py privatekey x y`

## How to push the latest SQLite database to AWS:

TODO

## Other tools used:

- https://emn178.github.io/online-tools/ecdsa/key-generator/ to generate and test EC P-256 keys informally
- https://jwt.io/ to inspect JWTs