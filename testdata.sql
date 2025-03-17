-- Insert into issuers:
-- all have their key hosted externally via DID
INSERT INTO issuers (sub_name, organization_name, approval_status, logo_uri, homepage_uri, signed_sub_statement)
VALUES 
    ('did:cheqd:mainnet:yG5tkXAzVq2p9mNLhz3r8KZuQW4yBXvM', 'OneUni University', 1, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAEnQAABJ0Ad5mH3gAAAB4SURBVEhLY1Da6ENTNGoBQTRqAUE0Yixwkq3X5tNgAANBkRlosvgQERbM0OaAmAwFNLFAkMNdW2KGkwjIE1S3AIFGLSCIRi0giEYtwIHq5Tk0BCEIaDwIwLh89RiKMRBRFkDNxQBUsoAyNGoBQTRqAUE01C3Y6AMAsDxJowXOs6oAAAAASUVORK5CYII=','https://oneuni.edu', 'eyJraWQiOiJvbmV1bmkta2V5MSIsInR5cCI6ImVudGl0eS1zdGF0ZW1lbnQrand0IiwiYWxnIjoiRVMyNTYifQ.eyJzdWIiOiJodHRwczovL3Rlc3Rvcmdhbml6YXRpb24uZXhhbXBsZS5jb20vaXNzdWVycy9kaWQ6Y2hlcWQ6bWFpbm5ldDp5RzV0a1hBelZxMnA5bU5MaHozcjhLWnVRVzR5Qlh2TSIsIm1ldGFkYXRhIjp7ImZlZGVyYXRpb25fZW50aXR5Ijp7Im9yZ2FuaXphdGlvbl9uYW1lIjoiT25lVW5pIFVuaXZlcnNpdHkiLCJob21lcGFnZV91cmkiOiJodHRwczovL29uZXVuaS5lZHUiLCJsb2dvX3VyaSI6ImRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQ0FBQUFBZ0NBSUFBQUQ4R08yakFBQUFBWE5TUjBJQXJzNGM2UUFBQUFSblFVMUJBQUN4and2OFlRVUFBQUFKY0VoWmN3QUFFblFBQUJKMEFkNW1IM2dBQUFCNFNVUkJWRWhMWTFEYTZFTlROR29CUVRScUFVRTBZaXh3a3EzWDV0TmdBQU5Ca1Jsb3N2Z1FFUmJNME9hQW1Bd0ZOTEZBa01OZFcyS0drd2pJRTFTM0FJRkdMU0NJUmkwZ2lFWXR3SUhxNVRrMEJDRUlhRHdJd0xoODlSaUtNUkJSRmtETnhRQlVzb0F5TkdvQlFUUnFBVUUwMUMzWTZBTUFzRHhKb3dYT3M2b0FBQUFBU1VWT1JLNUNZSUk9In19LCJqd2tzIjp7ImtleXMiOlt7Imt0eSI6IkVDIiwiY3J2IjoiUC0yNTYiLCJraWQiOiJvbmV1bmkta2V5MSIsIngiOiJ0Tm1yU0hNZ3FvdjRrSWtYZDBWcURXS1FhNHhvMm5yV3RVU2d0VWJEN29nIiwieSI6Imd4ZWE4bDVLWDhBajBHZm5COGhZS0I4WkVjVVljT1RnQURBVUF1STJVdjQifV19LCJpc3MiOiJodHRwczovL3Rlc3Rvcmdhbml6YXRpb24uZXhhbXBsZS5jb20vaXNzdWVyLXJlZ2lzdHJ5IiwiZXhwIjoxNzM4NzUyOTQxLCJpYXQiOjE3Mzg2NjY1NDEsImp0aSI6ImY0NmJjMTgzY2U2YjAxM2I1M2NhZmE0ZjIzNjQ4YmMxIn0.Ftg5H5tPrcEhi4iDWLTTEphQFPSSahYPLWVRDx-l3Ow2vQfmFGSehypYg9LwDKes_JDdWPVumaQXgAYZNOiV5Q'),
    ('did:cheqd:mainnet:xH9vmRCyWt6q3pKJdy8s5LZuVX2oNYbQ', 'TwoTraining Nursing School', 1, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAEnQAABJ0Ad5mH3gAAAErSURBVEhLY3wro8JAS8AEpWkGRi0gCEYtIAgGiQV/vs54/8TjyR1hMPJ49WrPH6gMQUA4J9//8sTkww8I25SN4/QvCJujVUImgwXMxAsI++DubxBpKiB5RkZlh5jMWxn5ldxAgR/Vn7+CJAgBosqi+38YFJEd++eDx4s3p9lEzogJKEKFcAKi4gDFdBIBWanoz6/TUBZhQI4Fe75/ApKmXNwEwwcISLfgz4ceUOzylfCwQgTwAxIt+PO1CBi9DAzxImIuUCECgBQLQInn+UJQkpXv44CKEQTEWnD/xytQ0mTgiBeR30Fc4EAAEfkAGCzvni/8xcDAxtcqJEZM7kUGJBUVHKZsYBoGtLjE+wj5hqRI/gEsiJDRNag4PjDabCEIRi0gCEYtIAAYGACdDWh34SOxkgAAAABJRU5ErkJggg==','https://twotraining.com', 'eyJraWQiOiJvbmV1bmkta2V5MSIsInR5cCI6ImVudGl0eS1zdGF0ZW1lbnQrand0IiwiYWxnIjoiRVMyNTYifQ.eyJzdWIiOiJodHRwczovL3Rlc3Rvcmdhbml6YXRpb24uZXhhbXBsZS5jb20vaXNzdWVycy9kaWQ6Y2hlcWQ6bWFpbm5ldDp5RzV0a1hBelZxMnA5bU5MaHozcjhLWnVRVzR5Qlh2TSIsIm1ldGFkYXRhIjp7ImZlZGVyYXRpb25fZW50aXR5Ijp7Im9yZ2FuaXphdGlvbl9uYW1lIjoiT25lVW5pIFVuaXZlcnNpdHkiLCJob21lcGFnZV91cmkiOiJodHRwczovL29uZXVuaS5lZHUiLCJsb2dvX3VyaSI6ImRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQ0FBQUFBZ0NBSUFBQUQ4R08yakFBQUFBWE5TUjBJQXJzNGM2UUFBQUFSblFVMUJBQUN4and2OFlRVUFBQUFKY0VoWmN3QUFFblFBQUJKMEFkNW1IM2dBQUFCNFNVUkJWRWhMWTFEYTZFTlROR29CUVRScUFVRTBZaXh3a3EzWDV0TmdBQU5Ca1Jsb3N2Z1FFUmJNME9hQW1Bd0ZOTEZBa01OZFcyS0drd2pJRTFTM0FJRkdMU0NJUmkwZ2lFWXR3SUhxNVRrMEJDRUlhRHdJd0xoODlSaUtNUkJSRmtETnhRQlVzb0F5TkdvQlFUUnFBVUUwMUMzWTZBTUFzRHhKb3dYT3M2b0FBQUFBU1VWT1JLNUNZSUk9In19LCJqd2tzIjp7ImtleXMiOlt7Imt0eSI6IkVDIiwiY3J2IjoiUC0yNTYiLCJraWQiOiJvbmV1bmkta2V5MSIsIngiOiJ0Tm1yU0hNZ3FvdjRrSWtYZDBWcURXS1FhNHhvMm5yV3RVU2d0VWJEN29nIiwieSI6Imd4ZWE4bDVLWDhBajBHZm5COGhZS0I4WkVjVVljT1RnQURBVUF1STJVdjQifV19LCJpc3MiOiJodHRwczovL3Rlc3Rvcmdhbml6YXRpb24uZXhhbXBsZS5jb20vaXNzdWVyLXJlZ2lzdHJ5IiwiZXhwIjoxNzM4NzUyOTk5LCJpYXQiOjE3Mzg2NjY1OTksImp0aSI6ImIyMWE2MmM1MDVkOWNkMmZhNDNjZDQxYTA5MWMxYWY4In0.Adx3wlUujFTD2ohnDz8jfcK67NOSKIz1CwvmbLTNk411YKC3g_niQqu7QacSaQ0_EEAR3OWggFSeLU2G6XFyFA'),
    ('did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK', 'ThreeTech College', 1, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAEnQAABJ0Ad5mH3gAAAFfSURBVEhLY5x58xUDLQETlKYZGLWAIBi1gCAYKRY8vH+lzqtTXSwdgiK8lhy6D5UiBIiw4FBJp5v55JVn7gHZhiZKQPL8mcOp5p0LibKDKB8AjVYKX95889XMFdvKb75qrjIBCW7fRUwpRoQFdj0zd50sb3IWg/IZxBz8Qf4gDhAXB/KKUAYEPLwNCi41FbiVeABxFiCDh3uXpC5iYDAJS3aGiuAFxFtw/8qhmXvrvNLdIp8axuXu2uYsD5XAD4i24NDUyam1q1aeATLvMVy78JDYZEpqjXb/1cN7u8ojD59nYAhfPrOJcCiRGgeKYvLOMSuW2wKZK3v3PoQI4gOkRzIIKEkaQlkEATEW3EcNxPtXFmavAgYRg5Y4EfFMRBwcKkkHp0slsKvvnQfFMxAoVZ0sj0fNH9gAYR+8YlBVMgSWDWeARoNNB9oETKZEmQ4Eo+0igmDUAoJgqFvAwAAABVpxX1PNHaUAAAAASUVORK5CYII=','https://threetech.com', 'eyJraWQiOiJvbmV1bmkta2V5MSIsInR5cCI6ImVudGl0eS1zdGF0ZW1lbnQrand0IiwiYWxnIjoiRVMyNTYifQ.eyJzdWIiOiJodHRwczovL3Rlc3Rvcmdhbml6YXRpb24uZXhhbXBsZS5jb20vaXNzdWVycy9kaWQ6Y2hlcWQ6bWFpbm5ldDp5RzV0a1hBelZxMnA5bU5MaHozcjhLWnVRVzR5Qlh2TSIsIm1ldGFkYXRhIjp7ImZlZGVyYXRpb25fZW50aXR5Ijp7Im9yZ2FuaXphdGlvbl9uYW1lIjoiT25lVW5pIFVuaXZlcnNpdHkiLCJob21lcGFnZV91cmkiOiJodHRwczovL29uZXVuaS5lZHUiLCJsb2dvX3VyaSI6ImRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQ0FBQUFBZ0NBSUFBQUQ4R08yakFBQUFBWE5TUjBJQXJzNGM2UUFBQUFSblFVMUJBQUN4and2OFlRVUFBQUFKY0VoWmN3QUFFblFBQUJKMEFkNW1IM2dBQUFCNFNVUkJWRWhMWTFEYTZFTlROR29CUVRScUFVRTBZaXh3a3EzWDV0TmdBQU5Ca1Jsb3N2Z1FFUmJNME9hQW1Bd0ZOTEZBa01OZFcyS0drd2pJRTFTM0FJRkdMU0NJUmkwZ2lFWXR3SUhxNVRrMEJDRUlhRHdJd0xoODlSaUtNUkJSRmtETnhRQlVzb0F5TkdvQlFUUnFBVUUwMUMzWTZBTUFzRHhKb3dYT3M2b0FBQUFBU1VWT1JLNUNZSUk9In19LCJqd2tzIjp7ImtleXMiOlt7Imt0eSI6IkVDIiwiY3J2IjoiUC0yNTYiLCJraWQiOiJvbmV1bmkta2V5MSIsIngiOiJ0Tm1yU0hNZ3FvdjRrSWtYZDBWcURXS1FhNHhvMm5yV3RVU2d0VWJEN29nIiwieSI6Imd4ZWE4bDVLWDhBajBHZm5COGhZS0I4WkVjVVljT1RnQURBVUF1STJVdjQifV19LCJpc3MiOiJodHRwczovL3Rlc3Rvcmdhbml6YXRpb24uZXhhbXBsZS5jb20vaXNzdWVyLXJlZ2lzdHJ5IiwiZXhwIjoxNzM4NzUzMDYxLCJpYXQiOjE3Mzg2NjY2NjEsImp0aSI6Ijk5NjU2MzRlY2Q1MGYzZGJiNmE3YWVkYTQ2NjBkOTgyIn0.K6GAHBtw7tZ8miHc-kAINbc2chWMTFh5GN-Y9CuP2TOWfa7H2Hf9E9-rQI7SeEdkIF3K0iRUkU4kXQX-4a555A');

-- Insert into issuer_public_keys
INSERT INTO issuer_public_keys (sub_name, key_id, jwks_kty, jwks_curve, jwt_alg, pub_key)
VALUES 
    ('did:cheqd:mainnet:yG5tkXAzVq2p9mNLhz3r8KZuQW4yBXvM', 'oneuni-key1', 'EC', 'P-256', 'ES256', '{"x":"tNmrSHMgqov4kIkXd0VqDWKQa4xo2nrWtUSgtUbD7og","y":"gxea8l5KX8Aj0GfnB8hYKB8ZEcUYcOTgADAUAuI2Uv4"}'), 
    ('did:cheqd:mainnet:xH9vmRCyWt6q3pKJdy8s5LZuVX2oNYbQ', 'twotraining-key1', 'EC', 'P-256', 'ES256', '{"x":"k82OaXuBoov6vd6RyBF2a8bc_1wDAWhnAnmJ3lT_v4A","y":"MEfF3awtEa7TSpyz_Xr_SYrQKodOuFp0G6iUFZmn5Rk"}'), 
    ('did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK', 'threetech-key1', 'EC', 'P-256', 'ES256', '{"x":"VnihszlJv1cUFXVHcvKHmagQ5fmMFDdntSmaBGHaP1s","y":"HoZa1RBiwdZrynRDh7UvVL4G8Iiw63NjsjzMT2R8btg"}'); 



-- Insert into registry_public_keys
INSERT INTO registry_public_keys (key_id, jwks_kty, jwks_curve, jwt_alg, pub_key)
VALUES 
    ('issuerregistry-key1', 'EC', 'P-256', 'ES256', '{"x":"Rz1NHMJ_tAZQXsJOYqnYruGYimG6WNOp0N234E7wqOs","y":"J5iCLb2T_ysCHpjFzcR3iW-tuDuXEHnJPvfVMQZOfzY"}');
    -- ('issuerregistry-key2', 'ED', 'Ed25519', 'EdDSA', '{"x":"aaa"}');


-- Insert into registry_private_keys
INSERT INTO registry_private_keys (key_id, priv_key)
VALUES 
    ('issuerregistry-key1', 'nHeosZap6ZDGYRcdaYqW264jOzRZkaxkUJp4syMnljA');
    -- ('issuerregistry-key2', 'aaa');