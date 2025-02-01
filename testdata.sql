-- Insert into issuers:
-- issuer1 has their key hosted internally
-- issuer2 has their key hosted externally
-- issuer3 has their key hosted internally, and a did and did_signed_sub_statement
INSERT INTO issuers (sub_name, organization_name, approval_status, logo_uri, homepage_uri, did, did_signed_sub_statement)
VALUES 
    ('https://sandbox123123.example.com/issuers/oneuni', 'OneUni University', 1, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAEnQAABJ0Ad5mH3gAAAB4SURBVEhLY1Da6ENTNGoBQTRqAUE0Yixwkq3X5tNgAANBkRlosvgQERbM0OaAmAwFNLFAkMNdW2KGkwjIE1S3AIFGLSCIRi0giEYtwIHq5Tk0BCEIaDwIwLh89RiKMRBRFkDNxQBUsoAyNGoBQTRqAUE01C3Y6AMAsDxJowXOs6oAAAAASUVORK5CYII=',
        'https://oneuni.edu', NULL, NULL),
    ('https://twotraining.com/it-services', 'TwoTraining Nursing School', 1, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAEnQAABJ0Ad5mH3gAAAErSURBVEhLY3wro8JAS8AEpWkGRi0gCEYtIAgGiQV/vs54/8TjyR1hMPJ49WrPH6gMQUA4J9//8sTkww8I25SN4/QvCJujVUImgwXMxAsI++DubxBpKiB5RkZlh5jMWxn5ldxAgR/Vn7+CJAgBosqi+38YFJEd++eDx4s3p9lEzogJKEKFcAKi4gDFdBIBWanoz6/TUBZhQI4Fe75/ApKmXNwEwwcISLfgz4ceUOzylfCwQgTwAxIt+PO1CBi9DAzxImIuUCECgBQLQInn+UJQkpXv44CKEQTEWnD/xytQ0mTgiBeR30Fc4EAAEfkAGCzvni/8xcDAxtcqJEZM7kUGJBUVHKZsYBoGtLjE+wj5hqRI/gEsiJDRNag4PjDabCEIRi0gCEYtIAAYGACdDWh34SOxkgAAAABJRU5ErkJggg==',
        'https://twotraining.com', NULL, NULL),
    ('https://sandbox123123.example.com/issuers/threetech', 'ThreeTech College', 1, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAEnQAABJ0Ad5mH3gAAAFfSURBVEhLY5x58xUDLQETlKYZGLWAIBi1gCAYKRY8vH+lzqtTXSwdgiK8lhy6D5UiBIiw4FBJp5v55JVn7gHZhiZKQPL8mcOp5p0LibKDKB8AjVYKX95889XMFdvKb75qrjIBCW7fRUwpRoQFdj0zd50sb3IWg/IZxBz8Qf4gDhAXB/KKUAYEPLwNCi41FbiVeABxFiCDh3uXpC5iYDAJS3aGiuAFxFtw/8qhmXvrvNLdIp8axuXu2uYsD5XAD4i24NDUyam1q1aeATLvMVy78JDYZEpqjXb/1cN7u8ojD59nYAhfPrOJcCiRGgeKYvLOMSuW2wKZK3v3PoQI4gOkRzIIKEkaQlkEATEW3EcNxPtXFmavAgYRg5Y4EfFMRBwcKkkHp0slsKvvnQfFMxAoVZ0sj0fNH9gAYR+8YlBVMgSWDWeARoNNB9oETKZEmQ4Eo+0igmDUAoJgqFvAwAAABVpxX1PNHaUAAAAASUVORK5CYII=',
        'https://threetech.com', 'did:example:123456789abcdef', 'signed_statement_abc123_BASE64');

-- Insert into issuer_public_keys
INSERT INTO issuer_public_keys (sub_name, sub_name_internal_key_id, x, y)
VALUES 
    ('https://sandbox123123.example.com/issuers/oneuni', 1, 'tNmrSHMgqov4kIkXd0VqDWKQa4xo2nrWtUSgtUbD7og', 'gxea8l5KX8Aj0GfnB8hYKB8ZEcUYcOTgADAUAuI2Uv4'),  -- Internally hosted key
    ('https://twotraining.com/it-services', NULL, 'k82OaXuBoov6vd6RyBF2a8bc_1wDAWhnAnmJ3lT_v4A', 'MEfF3awtEa7TSpyz_Xr_SYrQKodOuFp0G6iUFZmn5Rk'),  -- Externally hosted key (sub_name_internal_key_id is NULL)
    ('https://sandbox123123.example.com/issuers/threetech', 1, 'VnihszlJv1cUFXVHcvKHmagQ5fmMFDdntSmaBGHaP1s', 'HoZa1RBiwdZrynRDh7UvVL4G8Iiw63NjsjzMT2R8btg');  -- Internally hosted key


-- Insert into issuer_private_keys (only for internally hosted keys)
INSERT INTO issuer_private_keys (sub_name, sub_name_internal_key_id, p)
VALUES 
    ('https://sandbox123123.example.com/issuers/oneuni', 1, 'aniEY5Xk4i1221C1cCmnhQOX1F94xTlMjdfapQ9VHg4'),
    ('https://sandbox123123.example.com/issuers/threetech', 1, 'nd4N8us_xrKbvISGBn6rMe9pqXXsiFtEUsaXF3jNkx8');


-- Insert into registry_public_keys
INSERT INTO registry_public_keys (this_key_id, x, y)
VALUES 
    (1, 'eynui6NisFKRawSE0gfC7u85rKUAymbCbIyeJjGoBYw', 'dgRpK7Sgv0AKma2ULo7f9MtdjqkGo4GounSdDxVnLgo');

-- Insert into registry_private_keys
INSERT INTO registry_private_keys (this_key_id, p)
VALUES 
    (1, 'eynui6NisFKRawSE0gfC7u85rKUAymbCbIyeJjGoBYw');