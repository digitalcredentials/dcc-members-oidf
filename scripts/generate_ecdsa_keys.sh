#!/bin/bash


# 

rm -rf ./test_ecdsa_gen_check_outputs
mkdir ./test_ecdsa_gen_check_outputs


# Generate ECDSA P-256 key
openssl ecparam -name prime256v1 -genkey -noout -out ./test_ecdsa_gen_check_outputs/private.pem

# Extract private key in raw binary format (DER)
openssl ec -in ./test_ecdsa_gen_check_outputs/private.pem -noout -text | awk '/priv:/{flag=1; next} flag && NF {gsub(":", ""); printf "%s", $0} !NF {exit}' | xxd -r -p > ./test_ecdsa_gen_check_outputs/private_raw.bin

# Extract public key (x, y) in raw binary format (DER)
openssl ec -in ./test_ecdsa_gen_check_outputs/private.pem -pubout -outform DER | tail -c 65 | dd bs=1 skip=1 of=./test_ecdsa_gen_check_outputs/public.bin 2>/dev/null

# Split public key into x and y coordinates
head -c 32 ./test_ecdsa_gen_check_outputs/public.bin > ./test_ecdsa_gen_check_outputs/x.bin
tail -c 32 ./test_ecdsa_gen_check_outputs/public.bin > ./test_ecdsa_gen_check_outputs/y.bin

# Check the size of x.bin and y.bin
echo "Size of x.bin: $(wc -c < ./test_ecdsa_gen_check_outputs/x.bin) bytes"
echo "Size of y.bin: $(wc -c < ./test_ecdsa_gen_check_outputs/y.bin) bytes"

# Display the content of x.bin and y.bin using xxd (hex dump)
echo "x.bin content (hex):"
xxd ./test_ecdsa_gen_check_outputs/x.bin
echo "y.bin content (hex):"
xxd ./test_ecdsa_gen_check_outputs/y.bin

# Check if x.bin and y.bin have the correct size (32 bytes each)
if [ $(wc -c < ./test_ecdsa_gen_check_outputs/x.bin) -ne 32 ] || [ $(wc -c < ./test_ecdsa_gen_check_outputs/y.bin) -ne 32 ]; then
    echo "Error: x.bin or y.bin is not the correct size (should be 32 bytes each)."
    exit 1
else
    echo "x.bin and y.bin have the correct size."
fi

# Convert to BASE64URL format
base64url() {
    base64 | tr -d '=' | tr '/+' '_-'
}

# Encode private key and coordinates to Base64URL
PRIVATE_KEY_B64=$(base64url < ./test_ecdsa_gen_check_outputs/private_raw.bin)
X_B64=$(base64url < ./test_ecdsa_gen_check_outputs/x.bin)
Y_B64=$(base64url < ./test_ecdsa_gen_check_outputs/y.bin)

# Print output
echo "privatekey: $PRIVATE_KEY_B64"
echo "x: $X_B64"
echo "y: $Y_B64"

openssl ec -in ./test_ecdsa_gen_check_outputs/private.pem -noout -text 

rm -rf ./test_ecdsa_gen_check_outputs
