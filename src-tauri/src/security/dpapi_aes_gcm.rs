//! Phase 0 proof for current-user DPAPI wrapping and AES-256-GCM encryption.
//!
//! This is not a versioned production attachment format. DPAPI recovery is tied to the
//! Windows user's protected master keys and profile/environment. Backups must retain the
//! wrapped key bytes, nonce, ciphertext, and a supported recovery path for the same user;
//! copying an envelope to another user, machine, or freshly rebuilt profile is not guaranteed
//! to make it decryptable. Loss of the applicable DPAPI master-key material can make the data
//! unrecoverable. Merlin must surface that limitation in product backup/restore UX later.
//! There is deliberately no plaintext-key or plaintext-attachment fallback.

#[cfg(not(windows))]
use zeroize::Zeroizing;

use crate::error::AppError;

const AES_KEY_LENGTH: usize = 32;
const NONCE_LENGTH: usize = 12;

#[derive(Clone, PartialEq, Eq)]
pub struct DpapiAesGcmEnvelope {
    pub wrapped_key: Vec<u8>,
    pub nonce: [u8; NONCE_LENGTH],
    pub ciphertext: Vec<u8>,
}

#[cfg(windows)]
mod implementation {
    use aes_gcm::aead::{Aead, KeyInit};
    use aes_gcm::{Aes256Gcm, Nonce};
    use std::convert::TryFrom;
    use windows::core::PCWSTR;
    use windows::Win32::Foundation::{LocalFree, HLOCAL};
    use windows::Win32::Security::Cryptography::{
        BCryptGenRandom, CryptProtectData, CryptUnprotectData, BCRYPT_USE_SYSTEM_PREFERRED_RNG,
        CRYPTPROTECT_UI_FORBIDDEN, CRYPT_INTEGER_BLOB,
    };
    use zeroize::{Zeroize, Zeroizing};

    use super::{AppError, DpapiAesGcmEnvelope};
    use super::{AES_KEY_LENGTH, NONCE_LENGTH};

    pub fn wrap_aes_key_with_dpapi(key: &[u8]) -> Result<Vec<u8>, AppError> {
        if key.len() != AES_KEY_LENGTH {
            return Err(AppError::crypto(
                "DPAPI proof requires exactly one 256-bit AES key",
            ));
        }
        let input = integer_blob(key)?;
        let mut output = LocalBlob::default();
        // SAFETY: input and output blob pointers remain valid for the duration of the call.
        // UI is forbidden so Merlin never emits an unexpected DPAPI prompt.
        unsafe {
            CryptProtectData(
                &input,
                PCWSTR::null(),
                None,
                None,
                None,
                CRYPTPROTECT_UI_FORBIDDEN,
                &mut output.inner,
            )
        }
        .map_err(|_| AppError::crypto("current-user DPAPI key wrapping failed"))?;
        Ok(output.as_slice().to_vec())
    }

    pub fn unwrap_aes_key_with_dpapi(wrapped_key: &[u8]) -> Result<Zeroizing<Vec<u8>>, AppError> {
        if wrapped_key.is_empty() {
            return Err(AppError::crypto("wrapped DPAPI key is empty"));
        }
        let input = integer_blob(wrapped_key)?;
        let mut output = LocalBlob::default();
        // SAFETY: pointers refer to live blobs and no optional output description is requested.
        unsafe {
            CryptUnprotectData(
                &input,
                None,
                None,
                None,
                None,
                CRYPTPROTECT_UI_FORBIDDEN,
                &mut output.inner,
            )
        }
        .map_err(|_| AppError::crypto("current-user DPAPI key unwrapping failed"))?;
        if output.as_slice().len() != AES_KEY_LENGTH {
            return Err(AppError::crypto(
                "DPAPI unwrapped data is not a 256-bit AES key",
            ));
        }
        Ok(Zeroizing::new(output.as_slice().to_vec()))
    }

    pub fn encrypt_sensitive_bytes_for_preflight(
        plaintext: &[u8],
    ) -> Result<DpapiAesGcmEnvelope, AppError> {
        let key = random_key()?;
        let wrapped_key = wrap_aes_key_with_dpapi(&key)?;
        let nonce_bytes = random_nonce()?;
        let cipher = Aes256Gcm::new_from_slice(&key)
            .map_err(|_| AppError::crypto("AES-256-GCM key initialization failed"))?;
        let nonce = Nonce::try_from(nonce_bytes.as_slice())
            .map_err(|_| AppError::crypto("AES-GCM nonce initialization failed"))?;
        let ciphertext = cipher
            .encrypt(&nonce, plaintext)
            .map_err(|_| AppError::crypto("AES-256-GCM encryption failed"))?;
        Ok(DpapiAesGcmEnvelope {
            wrapped_key,
            nonce: nonce_bytes,
            ciphertext,
        })
    }

    pub fn decrypt_sensitive_bytes_for_preflight(
        envelope: &DpapiAesGcmEnvelope,
    ) -> Result<Zeroizing<Vec<u8>>, AppError> {
        let key = unwrap_aes_key_with_dpapi(&envelope.wrapped_key)?;
        let cipher = Aes256Gcm::new_from_slice(&key)
            .map_err(|_| AppError::crypto("AES-256-GCM key initialization failed"))?;
        let nonce = Nonce::try_from(envelope.nonce.as_slice())
            .map_err(|_| AppError::crypto("AES-GCM nonce initialization failed"))?;
        let plaintext = cipher
            .decrypt(&nonce, envelope.ciphertext.as_ref())
            .map_err(|_| AppError::crypto("AES-256-GCM authentication or decryption failed"))?;
        Ok(Zeroizing::new(plaintext))
    }

    fn random_key() -> Result<Zeroizing<Vec<u8>>, AppError> {
        let mut key = Zeroizing::new(vec![0_u8; AES_KEY_LENGTH]);
        fill_windows_random(key.as_mut_slice())?;
        Ok(key)
    }

    fn random_nonce() -> Result<[u8; NONCE_LENGTH], AppError> {
        let mut nonce = [0_u8; NONCE_LENGTH];
        fill_windows_random(&mut nonce)?;
        Ok(nonce)
    }

    fn fill_windows_random(buffer: &mut [u8]) -> Result<(), AppError> {
        // SAFETY: BCrypt writes only into the supplied mutable slice when passed the system RNG flag.
        let status = unsafe { BCryptGenRandom(None, buffer, BCRYPT_USE_SYSTEM_PREFERRED_RNG) };
        if status.0 < 0 {
            return Err(AppError::crypto("Windows secure RNG failed"));
        }
        Ok(())
    }

    fn integer_blob(bytes: &[u8]) -> Result<CRYPT_INTEGER_BLOB, AppError> {
        let length =
            u32::try_from(bytes.len()).map_err(|_| AppError::crypto("DPAPI input is too large"))?;
        Ok(CRYPT_INTEGER_BLOB {
            cbData: length,
            // DPAPI declares this input pointer mutable but does not mutate the input bytes.
            pbData: bytes.as_ptr() as *mut u8,
        })
    }

    /// Owns DPAPI LocalAlloc output, zeroizing plaintext before releasing it.
    #[derive(Default)]
    struct LocalBlob {
        inner: CRYPT_INTEGER_BLOB,
    }

    impl LocalBlob {
        fn as_slice(&self) -> &[u8] {
            if self.inner.pbData.is_null() || self.inner.cbData == 0 {
                return &[];
            }
            // SAFETY: a successful DPAPI call owns this allocation for cbData bytes until Drop.
            unsafe { std::slice::from_raw_parts(self.inner.pbData, self.inner.cbData as usize) }
        }
    }

    impl Drop for LocalBlob {
        fn drop(&mut self) {
            if self.inner.pbData.is_null() {
                return;
            }
            // SAFETY: this is the unique owning wrapper for the DPAPI LocalAlloc allocation.
            unsafe {
                std::slice::from_raw_parts_mut(self.inner.pbData, self.inner.cbData as usize)
                    .zeroize();
                let _ = LocalFree(Some(HLOCAL(self.inner.pbData.cast())));
            }
        }
    }
}

#[cfg(not(windows))]
mod implementation {
    use super::{AppError, DpapiAesGcmEnvelope, Zeroizing};
    use crate::error::AppErrorCode;

    fn unsupported() -> AppError {
        AppError::new(
            AppErrorCode::UnsupportedPlatform,
            "DPAPI proof is available only on Windows; no plaintext fallback exists",
        )
    }

    pub fn wrap_aes_key_with_dpapi(_key: &[u8]) -> Result<Vec<u8>, AppError> {
        Err(unsupported())
    }

    pub fn unwrap_aes_key_with_dpapi(_wrapped_key: &[u8]) -> Result<Zeroizing<Vec<u8>>, AppError> {
        Err(unsupported())
    }

    pub fn encrypt_sensitive_bytes_for_preflight(
        _plaintext: &[u8],
    ) -> Result<DpapiAesGcmEnvelope, AppError> {
        Err(unsupported())
    }

    pub fn decrypt_sensitive_bytes_for_preflight(
        _envelope: &DpapiAesGcmEnvelope,
    ) -> Result<Zeroizing<Vec<u8>>, AppError> {
        Err(unsupported())
    }
}

pub use implementation::*;
