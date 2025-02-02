import base64
import argparse
import fastecdsa.keys
import fastecdsa.curve

# example: python3 ./test.py tzWTn7F1acOdsPwvAsQEp1UMmGwUS33G9BVMsbNhrX0 qvQp4kssA1orZnRwCNO36ErC3U6fQySVchtQ5ZbsU48 eG_8qDxeagabYrI6VIpK6gPiQN8Mm5aY1psMvKjmQQQ
# checks to see if argument A (private key, base64URL encoded), matches argument B and C (x and y values for ECDSA)

def check_key_match(privatekey_b64url, x_b64url, y_b64url):
    # Decode the base64url-encoded strings
    private_key_bytes = base64.urlsafe_b64decode(privatekey_b64url + '==')  # Add padding
    private_key_int = int.from_bytes(private_key_bytes, byteorder='big')

    x_bytes = base64.urlsafe_b64decode(x_b64url + '==')
    y_bytes = base64.urlsafe_b64decode(y_b64url + '==')
    x_int = int.from_bytes(x_bytes, byteorder='big')
    y_int = int.from_bytes(y_bytes, byteorder='big')

    # Define curve (P256)
    curve = fastecdsa.curve.P256

    # Generate the public key from the private key
    generated_pubkey = fastecdsa.keys.get_public_key(private_key_int, curve)

    # Check if the x and y components match
    if generated_pubkey.x == x_int and generated_pubkey.y == y_int:
        print("correct key match")
    else:
        print("incorrect key match")

if __name__ == "__main__":
    # Set up the argument parser
    parser = argparse.ArgumentParser(description="Check if the public key matches the private key.")
    parser.add_argument("privatekey_b64url", help="The base64url-encoded private key.")
    parser.add_argument("x_b64url", help="The base64url-encoded x-coordinate of the public key.")
    parser.add_argument("y_b64url", help="The base64url-encoded y-coordinate of the public key.")

    # Parse arguments
    args = parser.parse_args()

    # Call the function with the provided arguments
    check_key_match(args.privatekey_b64url, args.x_b64url, args.y_b64url)
