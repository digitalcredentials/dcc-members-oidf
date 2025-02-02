-- Table for all issuers which exist in the registry. If the registry is pinged, it should respond with
-- this list where approval status <> 0.
CREATE TABLE issuers (
    sub_name TEXT PRIMARY KEY,
    organization_name TEXT NOT NULL,
    approval_status INTEGER NOT NULL,
    logo_uri TEXT NOT NULL,
    homepage_uri TEXT NOT NULL,
    did TEXT,
    did_signed_sub_statement TEXT,
    CONSTRAINT did_constraints CHECK (
        (did IS NOT NULL AND did_signed_sub_statement IS NOT NULL) OR
        (did IS NULL AND did_signed_sub_statement IS NULL)
    )

);

-- Table for all issuer public keys stored in the registry. At the moment, only supports ECC P-256.
CREATE TABLE issuer_public_keys (
    sub_name TEXT NOT NULL,
    key_id TEXT NOT NULL,
    x TEXT NOT NULL,
    y TEXT NOT NULL,
    PRIMARY KEY (sub_name, key_id),
    FOREIGN KEY (sub_name) REFERENCES issuers(sub_name) ON DELETE CASCADE
);

-- Internally hosted private keys
-- Constraint: if sub_name starts with "https://testorganization.example.com/" then the private key can be hosted
-- (can't host other people's private keys)
CREATE TABLE issuer_private_keys (
    sub_name TEXT NOT NULL,
    key_id TEXT NOT NULL,
    d TEXT NOT NULL,
    PRIMARY KEY (sub_name, key_id),
    FOREIGN KEY (sub_name, key_id) REFERENCES issuer_public_keys(sub_name, key_id) ON DELETE CASCADE
    CONSTRAINT only_host_our_own_PKs CHECK (sub_name LIKE 'https://testorganization.example.com/%')
);


-- Table for all trust registry public keys. At the moment, only supports ECC P-256.
CREATE TABLE registry_public_keys (
    this_key_id TEXT NOT NULL,
    x TEXT NOT NULL,
    y TEXT NOT NULL,
    PRIMARY KEY (this_key_id)
);

-- Table for all trust registry private keys
CREATE TABLE registry_private_keys (
    this_key_id TEXT NOT NULL,
    d TEXT NOT NULL,
    PRIMARY KEY (this_key_id),
    FOREIGN KEY (this_key_id) REFERENCES registry_public_keys(this_key_id) ON DELETE CASCADE
);


PRAGMA foreign_keys = ON;

