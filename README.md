# dcc-members-oidf

## Description:

TODO

## Dependencies:

sqlite3, express, jose

## Key commands:

- Load schema.sql into DB: `npm run builddb`
- Load test data into DB: `npm run loadtestdata`
- Generate server keys (HTTPS): `npm run keygen`
- Launch webservice: `npm run webservice`
- Test endpoint: `curl -X GET http://localhost:3000/test1`

## Ancillary scripts

- Generate a sample set of ECDSA private and public keys: `./scripts/generate_ecdsa_keys.sh`
- Check to see if a sample set of ECDSA private and public keys are valid: `python3 ./test.py privatekey x y`

## How to push the latest SQLite database to AWS:

TODO



## Other tools used:

- https://emn178.github.io/online-tools/ecdsa/key-generator/ to generate test EC P-256 keys