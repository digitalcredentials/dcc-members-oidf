-- Insert into issuers:
-- all have their key hosted externally via DID
INSERT INTO issuers (sub_name, organization_name, logo_uri, homepage_uri, legal_name, ctid, rorid)
VALUES 
    ('did:web:oneuni.testuni.edu', 'OneUni University', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAEnQAABJ0Ad5mH3gAAAB4SURBVEhLY1Da6ENTNGoBQTRqAUE0Yixwkq3X5tNgAANBkRlosvgQERbM0OaAmAwFNLFAkMNdW2KGkwjIE1S3AIFGLSCIRi0giEYtwIHq5Tk0BCEIaDwIwLh89RiKMRBRFkDNxQBUsoAyNGoBQTRqAUE01C3Y6AMAsDxJowXOs6oAAAAASUVORK5CYII=','https://oneuni.edu', 'Board and Trustees of OneUni University', 'ce-e8a41a52-6ff6-48f0-9872-889c87b093b7', '042nb2s44'),
    ('did:web:twotr.testschool.edu', 'TwoTraining Nursing School', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAEnQAABJ0Ad5mH3gAAAErSURBVEhLY3wro8JAS8AEpWkGRi0gCEYtIAgGiQV/vs54/8TjyR1hMPJ49WrPH6gMQUA4J9//8sTkww8I25SN4/QvCJujVUImgwXMxAsI++DubxBpKiB5RkZlh5jMWxn5ldxAgR/Vn7+CJAgBosqi+38YFJEd++eDx4s3p9lEzogJKEKFcAKi4gDFdBIBWanoz6/TUBZhQI4Fe75/ApKmXNwEwwcISLfgz4ceUOzylfCwQgTwAxIt+PO1CBi9DAzxImIuUCECgBQLQInn+UJQkpXv44CKEQTEWnD/xytQ0mTgiBeR30Fc4EAAEfkAGCzvni/8xcDAxtcqJEZM7kUGJBUVHKZsYBoGtLjE+wj5hqRI/gEsiJDRNag4PjDabCEIRi0gCEYtIAAYGACdDWh34SOxkgAAAABJRU5ErkJggg==','https://twotraining.com', 'TwoTraining Nursing School', NULL, NULL),
    ('did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK', 'ThreeTech College', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAEnQAABJ0Ad5mH3gAAAFfSURBVEhLY5x58xUDLQETlKYZGLWAIBi1gCAYKRY8vH+lzqtTXSwdgiK8lhy6D5UiBIiw4FBJp5v55JVn7gHZhiZKQPL8mcOp5p0LibKDKB8AjVYKX95889XMFdvKb75qrjIBCW7fRUwpRoQFdj0zd50sb3IWg/IZxBz8Qf4gDhAXB/KKUAYEPLwNCi41FbiVeABxFiCDh3uXpC5iYDAJS3aGiuAFxFtw/8qhmXvrvNLdIp8axuXu2uYsD5XAD4i24NDUyam1q1aeATLvMVy78JDYZEpqjXb/1cN7u8ojD59nYAhfPrOJcCiRGgeKYvLOMSuW2wKZK3v3PoQI4gOkRzIIKEkaQlkEATEW3EcNxPtXFmavAgYRg5Y4EfFMRBwcKkkHp0slsKvvnQfFMxAoVZ0sj0fNH9gAYR+8YlBVMgSWDWeARoNNB9oETKZEmQ4Eo+0igmDUAoJgqFvAwAAABVpxX1PNHaUAAAAASUVORK5CYII=','https://threetech.com', 'ThreeTech College', NULL, NULL);

-- Insert into registry_public_keys
INSERT INTO registry_public_keys (key_id, jwks_kty, jwks_curve, jwt_alg, pub_key)
VALUES 
    ('issuerregistry-key1', 'EC', 'P-256', 'ES256', '{"x":"Rz1NHMJ_tAZQXsJOYqnYruGYimG6WNOp0N234E7wqOs","y":"J5iCLb2T_ysCHpjFzcR3iW-tuDuXEHnJPvfVMQZOfzY"}');
    -- ('issuerregistry-key2', 'ED', 'Ed25519', 'EdDSA', '{"x":"aaa"}');

-- Insert into registry_private_keys
-- INSERT INTO registry_private_keys (key_id, priv_key)
-- VALUES 
    -- ('issuerregistry-key1', 'nHeosZap6ZDGYRcdaYqW264jOzRZkaxkUJp4syMnljA');
    -- ('issuerregistry-key2', 'aaa');