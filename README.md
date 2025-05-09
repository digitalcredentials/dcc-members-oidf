# dcc-members-oidf

## Description:

A pilot implementation of an issuer registry for learning and employment credentials, using the [OpenID Federation](https://openid.net/specs/openid-federation-1_0.html) specification.

![status badge](https://github.com/digitalcredentials/dcc-members-oidf/actions/workflows/apitests.yml/badge.svg)

## Dependencies:

sqlite3, express, jose

## AWS setup:

Create 2 certificates in Certificate Manager for your subdomain(s):
registry.dcconsortium.org
test.registry.dcconsortium.org

## Key commands:

1. Create/recreate DB schema: `npm run builddb`
2. Load/reload test data into DB: `npm run localtestdata`
3. Generate local server cert (HTTPS): `npm run keygen`
4. Launch webservice: `npm run webservice`
5. Test endpoint(s): `curl -X GET http://localhost:3000/.well-known/openid-federation` e.g. `curl -X GET https://localhost:3000/.well-known/openid-federation`. Also see `tests/DCC_OIDF.postman_collection.json` for a suite of Postman tests.
6. Push prod/test/certs to AWS: `terraform apply "-target=module.certificates"` `terraform apply "-target=module.test"` `terraform apply "-target=module.production"`

## Ancillary scripts

- Generate a sample set of ECDSA private and public keys: `./scripts/generate_ecdsa_keys.sh`
- Check to see if a sample set of ECDSA private and public keys are valid: `python3 ./test.py privatekey x y`

## How to push the latest test database data to AWS:

1. Potentially run `aws dynamodb delete-table --table-name dcc-oidf-t-db-registry-public-keys; aws dynamodb delete-table --table-name db-issuer_public_keys; aws dynamodb delete-table --table-name dcc-oidf-t-db-issuers`, which will wipe the DynamoDB tables
2. Potentially run `terraform apply` to recreate tables
3. Run `python ./convert.py`, which will convert `testdata.sql` (suitable for SQLlite) into `testdata.json` (suitable for DynamoDB)
4. Run `aws dynamodb batch-write-item --request-items file://testdata.json`, which will load that data into AWS

## How to update the test database schema:

1. On local, update `schema.sql` and `testdata.sql`
2. On test and prod AWS, update `aws_dynamodb_table items` in `main.tf`
3. `aws configure` and add in the correct AWS IAM information for the service account
4. `terraform plan` (if fails, run `terraform init`)
5. `terraform apply`
6. Re-run the above section "How to push the latest test database to AWS"

## Other tools used:

- https://emn178.github.io/online-tools/ecdsa/key-generator/ to generate and test EC P-256 keys informally
- https://jwt.io/ to inspect JWTs




## How to set up your DNS records:

Using `terraform output`, add to your DNS records:
- First: certificate_validation_cname and subdomain_validation_cname
- Next: api_gateway_cname


General note about deployment:
- For the first deployment of the cloudwatch distributions, the deployment might fail on the first time, then it might actually be deployed and the import will need to happen manually (`terraform import`)


## System diagram generation

Can use eraser.io but it's recommended to double-check the outputs.


## Note from ChatGPT about different endpoints:

Q: Why is api_gateway_invoke_url = "https://XXXXXXXXX.execute-api.us-east-1.amazonaws.com/dev" but api_gateway_endpoint   = "d-YYYYYYYYYY.execute-api.us-east-1.amazonaws.com" ?

A: 
Ah, this is a good observation! The difference between these two URLs is due to how API Gateway handles different types of endpoints:

1. `api_gateway_invoke_url` (`https://XXXXXXXXX.execute-api.us-east-1.amazonaws.com/dev`):
   - This is the default API Gateway endpoint
   - `XXXXXXXXX` is the API Gateway ID
   - This URL includes the stage name (`/dev`)
   - This is the URL you'd use if you're not using a custom domain

2. `api_gateway_endpoint` (`d-YYYYYYYYYY.execute-api.us-east-1.amazonaws.com`):
   - This is the custom domain endpoint
   - `d-YYYYYYYYYY` is a different identifier used specifically for custom domains
   - This is the endpoint that Route53 points to
   - This endpoint is used when accessing the API through your custom domain (`test.registry.dcconsortium.org`)

The reason for the different identifiers is that API Gateway uses different endpoint configurations for:
- Default API Gateway endpoints (used when accessing via the API Gateway URL)
- Custom domain endpoints (used when accessing via your own domain)

Both endpoints ultimately point to the same API Gateway, but they're accessed through different URLs. The custom domain endpoint (`d-YYYYYYYYYY`) is specifically designed to work with Route53 and custom domains, while the default endpoint (`XXXXXXXXX`) is for direct API Gateway access.

When you make requests to your API, you should use the custom domain URL (`https://test.registry.dcconsortium.org/`) rather than either of these internal endpoints.
