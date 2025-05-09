-- Table for all issuers which exist in the registry. If the registry is pinged, it should respond with
-- this list where approval status <> 0.
CREATE TABLE issuers (
    sub_name TEXT PRIMARY KEY,
    organization_name TEXT NOT NULL,
    logo_uri TEXT NOT NULL,
    homepage_uri TEXT NOT NULL,
    legal_name TEXT NOT NULL,
    ctid TEXT,
    rorid TEXT
);

-- Table for all trust registry public keys. At the moment, only supports ECC P-256.
CREATE TABLE "registry-public-keys" (
    key_id TEXT PRIMARY KEY,
    jwks_kty TEXT NOT NULL,
    jwks_curve TEXT NOT NULL,
    jwt_alg TEXT NOT NULL,
    pub_key TEXT NOT NULL
);

-- Table for all trust registry private keys
CREATE TABLE registry_private_keys (
    key_id TEXT PRIMARY KEY,
    priv_key TEXT NOT NULL,
    FOREIGN KEY (key_id) REFERENCES "registry-public-keys"(key_id)
);

PRAGMA foreign_keys = ON;

