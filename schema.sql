-- Table for all issuers which exist in the registry. If the registry is pinged, it should respond with
-- this list where approval status <> 0.
CREATE TABLE issuers (
    sub_name TEXT PRIMARY KEY,
    organization_name TEXT NOT NULL,
    approval_status INTEGER NOT NULL,
    logo_uri TEXT NOT NULL,
    homepage_uri TEXT NOT NULL,
    signed_sub_statement TEXT
);

-- Table for all issuer public keys stored in the registry. At the moment, only supports ECC P-256.
CREATE TABLE issuer_public_keys (
    sub_name TEXT NOT NULL,
    key_id TEXT NOT NULL,
    jwks_kty TEXT NOT NULL,
    jwks_curve TEXT NOT NULL,
    jwt_alg TEXT NOT NULL,
    pub_key TEXT NOT NULL,
    PRIMARY KEY (sub_name, key_id),
    FOREIGN KEY (sub_name) REFERENCES issuers(sub_name) ON DELETE CASCADE
);


-- Table for all trust registry public keys. At the moment, only supports ECC P-256.
CREATE TABLE registry_public_keys (
    key_id TEXT NOT NULL,
    jwks_kty TEXT NOT NULL,
    jwks_curve TEXT NOT NULL,
    jwt_alg TEXT NOT NULL,
    pub_key TEXT NOT NULL,
    PRIMARY KEY (key_id)
);

-- Table for all trust registry private keys
CREATE TABLE registry_private_keys (
    key_id TEXT NOT NULL,
    priv_key TEXT NOT NULL,
    PRIMARY KEY (key_id),
    FOREIGN KEY (key_id) REFERENCES registry_public_keys(key_id) ON DELETE CASCADE
);


PRAGMA foreign_keys = ON;

