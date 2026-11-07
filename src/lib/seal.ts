/**
 * Walform E2E Security Seal (Asymmetric Encryption)
 * 
 * Uses Web Crypto API (SubtleCrypto) for secure E2E.
 * 1. Admin generates an RSA Key Pair.
 * 2. Public Key is stored in FormConfig (public).
 * 3. Private Key is encrypted with Admin's Wallet Signature and stored in FormConfig (sealed).
 * 4. Submitter encrypts data with Public Key.
 * 5. Admin decrypts Private Key with their Signature, then decrypts data.
 */

/**
 * Derives a symmetric key from a signature for sealing/unsealing the private key
 */
async function deriveSymmetricKey(signature: string): Promise<CryptoKey> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(signature));
  return await crypto.subtle.importKey(
    'raw',
    hash,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generates a new Security Seal (RSA Key Pair)
 * Returns { publicKeyJwk, sealedPrivateKey }
 */
export async function generateSeal(signature: string) {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  );

  const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
  const privateKeyStr = JSON.stringify(privateKeyJwk);

  // Seal the private key with the admin's signature
  const masterKey = await deriveSymmetricKey(signature);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedPriv = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    masterKey,
    new TextEncoder().encode(privateKeyStr)
  );

  const sealedPrivateKey = JSON.stringify({
    iv: Buffer.from(iv).toString('base64'),
    ciphertext: Buffer.from(new Uint8Array(encryptedPriv)).toString('base64')
  });

  return { publicKeyJwk, sealedPrivateKey };
}

/**
 * Encrypts data for a form using its Public Key
 */
export async function encryptForSeal(data: string, publicKeyJwk: any): Promise<string> {
  const publicKey = await crypto.subtle.importKey(
    'jwk',
    publicKeyJwk,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  );

  const aesKey = crypto.getRandomValues(new Uint8Array(32));
  const cryptoAesKey = await crypto.subtle.importKey('raw', aesKey, { name: 'AES-GCM' }, false, ['encrypt']);
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoAesKey,
    new TextEncoder().encode(data)
  );

  const wrappedKey = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    publicKey,
    aesKey
  );

  return JSON.stringify({
    iv: Buffer.from(iv).toString('base64'),
    ciphertext: Buffer.from(new Uint8Array(ciphertext)).toString('base64'),
    wrappedKey: Buffer.from(new Uint8Array(wrappedKey)).toString('base64')
  });
}

/**
 * Decrypts data using the Admin's Signature to unseal the Private Key
 */
export async function decryptWithSeal(
  encryptedPayload: string,
  sealedPrivateKey: string,
  signature: string
): Promise<string> {
  try {
    const masterKey = await deriveSymmetricKey(signature);
    const { iv: privIv, ciphertext: privCipher } = JSON.parse(sealedPrivateKey);
    const decryptedPriv = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: Buffer.from(privIv, 'base64') },
      masterKey,
      Buffer.from(privCipher, 'base64')
    );
    const privateKeyJwk = JSON.parse(new TextDecoder().decode(decryptedPriv));
    const privateKey = await crypto.subtle.importKey(
      'jwk',
      privateKeyJwk,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      false,
      ['decrypt']
    );

    const { iv, ciphertext, wrappedKey } = JSON.parse(encryptedPayload);
    const aesKey = await crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      privateKey,
      Buffer.from(wrappedKey, 'base64')
    );
    const cryptoAesKey = await crypto.subtle.importKey('raw', aesKey, { name: 'AES-GCM' }, false, ['decrypt']);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: Buffer.from(iv, 'base64') },
      cryptoAesKey,
      Buffer.from(ciphertext, 'base64')
    );

    return new TextDecoder().decode(decrypted);
  } catch (err) {
    console.error('[Seal] Secure decryption failed:', err);
    throw new Error('Decryption failed. Ensure you are using the correct admin wallet.');
  }
}

// ---------------------------------------------------------------------------
// BINARY SYMMETRIC ENCRYPTION (For File Payload Encryption)
// ---------------------------------------------------------------------------

async function getPasswordKey(password: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  // Using a fixed salt for simplicity since the password itself should be strong/unique for the file
  const salt = enc.encode('walsign-file-salt-v1'); 
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptBytesWithPassword(data: Uint8Array, password: string): Promise<Uint8Array> {
  const key = await getPasswordKey(password);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  
  // Pack IV + ciphertext into a single Uint8Array
  const result = new Uint8Array(iv.length + ciphertext.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(ciphertext), iv.length);
  return result;
}

export async function decryptBytesWithPassword(encryptedData: Uint8Array, password: string): Promise<Uint8Array> {
  if (encryptedData.length < 12) throw new Error('Invalid encrypted data payload');
  const iv = encryptedData.slice(0, 12);
  const ciphertext = encryptedData.slice(12);
  const key = await getPasswordKey(password);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
  return new Uint8Array(decrypted);
}

export function generateRandomKeyHex(): string {
  const key = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(key).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function encryptBytesWithKey(data: Uint8Array, keyHex: string): Promise<Uint8Array> {
  const keyBytes = new Uint8Array(keyHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data
  );
  const result = new Uint8Array(iv.length + ciphertext.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(ciphertext), iv.length);
  return result;
}

export async function decryptBytesWithKey(encryptedData: Uint8Array, keyHex: string): Promise<Uint8Array> {
  if (encryptedData.length < 12) throw new Error('Invalid encrypted data payload');
  const iv = encryptedData.slice(0, 12);
  const ciphertext = encryptedData.slice(12);
  const keyBytes = new Uint8Array(keyHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    ciphertext
  );
  return new Uint8Array(decrypted);
}

// ---------------------------------------------------------------------------
// LEGACY SYMMETRIC ENCRYPTION (Less secure, kept for backward compat)
// ---------------------------------------------------------------------------

export async function encryptData(data: string, keyStr: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(keyStr));
  const key = await crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(data));
  return JSON.stringify({
    iv: Buffer.from(iv).toString('base64'),
    ciphertext: Buffer.from(new Uint8Array(ciphertext)).toString('base64'),
  });
}

export async function decryptData(encrypted: string, keyStr: string): Promise<string> {
  try {
    const { iv, ciphertext } = JSON.parse(encrypted);
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(keyStr));
    const key = await crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['decrypt']);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: Buffer.from(iv, 'base64') },
      key,
      Buffer.from(ciphertext, 'base64')
    );
    return new TextDecoder().decode(decrypted);
  } catch (err) {
    console.error('[Legacy] Decrypt failed:', err);
    throw new Error('Decryption failed.');
  }
}
