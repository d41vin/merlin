#![cfg(windows)]

use merlin_preflight::error::PreflightErrorCode;
use merlin_preflight::security::dpapi_aes_gcm::{
    decrypt_sensitive_bytes_for_preflight, encrypt_sensitive_bytes_for_preflight,
    unwrap_aes_key_with_dpapi, wrap_aes_key_with_dpapi,
};
use zeroize::Zeroize;

#[test]
fn dpapi_wrapped_aes_gcm_round_trip_authenticates_plaintext() {
    let plaintext = b"synthetic Phase 0 bytes; never a real private attachment";
    let envelope = encrypt_sensitive_bytes_for_preflight(plaintext).expect("encrypt proof bytes");
    assert!(!envelope.wrapped_key.is_empty());
    assert_eq!(envelope.nonce.len(), 12);
    assert_ne!(envelope.ciphertext.as_slice(), plaintext);

    let mut unwrapped = unwrap_aes_key_with_dpapi(&envelope.wrapped_key).expect("unwrap AES key");
    assert_eq!(unwrapped.len(), 32);
    unwrapped.zeroize();
    assert!(unwrapped.iter().all(|byte| *byte == 0));

    let decrypted = decrypt_sensitive_bytes_for_preflight(&envelope).expect("decrypt proof bytes");
    assert_eq!(decrypted.as_slice(), plaintext);
}

#[test]
fn tampering_or_wrong_dpapi_data_is_rejected_without_a_fallback() {
    let plaintext = b"tamper-evident synthetic payload";
    let envelope = encrypt_sensitive_bytes_for_preflight(plaintext).expect("encrypt proof bytes");

    let mut ciphertext_tampered = envelope.clone();
    let index = ciphertext_tampered.ciphertext.len() / 2;
    ciphertext_tampered.ciphertext[index] ^= 0x80;
    let error = decrypt_sensitive_bytes_for_preflight(&ciphertext_tampered)
        .expect_err("tampered ciphertext authenticated");
    assert_eq!(error.code, PreflightErrorCode::Crypto);

    let mut nonce_tampered = envelope.clone();
    nonce_tampered.nonce[0] ^= 1;
    assert!(decrypt_sensitive_bytes_for_preflight(&nonce_tampered).is_err());

    let mut wrapped_tampered = envelope.clone();
    let index = wrapped_tampered.wrapped_key.len() / 2;
    wrapped_tampered.wrapped_key[index] ^= 1;
    assert!(decrypt_sensitive_bytes_for_preflight(&wrapped_tampered).is_err());

    assert!(unwrap_aes_key_with_dpapi(&[0_u8; 64]).is_err());
    assert!(wrap_aes_key_with_dpapi(&[7_u8; 16]).is_err());
}
