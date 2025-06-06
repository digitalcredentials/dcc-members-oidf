-- Table for all issuers which exist in the registry. If the registry is pinged, it should respond with
-- this list where approval status <> 0.
CREATE TABLE issuers (
    sub_name TEXT PRIMARY KEY, -- Subject name (DID)
    organization_name TEXT NOT NULL, -- Organization Name
    logo_uri TEXT NOT NULL, -- Logo URI (can be base64)
    homepage_uri TEXT NOT NULL, -- Homepage URI
    legal_name TEXT NOT NULL, -- Legal Name
    ctid TEXT, -- CTID (optional), also presented as CE URL in the entity statement output
    rorid TEXT -- ROR ID (optional), also presented as ROR URL in the entity statement output
);

-- Table for all trust registry public keys. At the moment, only supports ECC P-256.
CREATE TABLE "registry-public-keys" (
    key_id TEXT PRIMARY KEY, -- string ID for the key, e.g. issuerregistry-key1
    jwks_kty TEXT NOT NULL, -- Key type (currently only supports EC)
    jwks_curve TEXT NOT NULL, -- Curve (currently only supports P-256)
    jwt_alg TEXT NOT NULL, -- JWT Algorithm (currently only supports ES256)
    pub_key TEXT NOT NULL, -- Public key, in format '{"x":"Rz1NHMJ_tAZQXsJOYqnYruGYimG6WNOp0N234E7wqOs","y":"J5iCLb2T_ysCHpjFzcR3iW-tuDuXEHnJPvfVMQZOfzY"}'
    private_key TEXT NOT NULL -- Private key (base64), in format 'nHeosZap6ZDGYRcdaYqW264jOzRZkaxkUJp4syMnljA
);

PRAGMA foreign_keys = ON;

