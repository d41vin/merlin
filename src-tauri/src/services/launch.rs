use std::path::{Path, PathBuf};
use std::process::{Command, ExitStatus, Stdio};

use crate::error::{PreflightError, PreflightErrorCode};

const HTTPS_PREFIX: &str = "https://";
const MAX_URL_LENGTH: usize = 4_096;
const DENIED_SHELL_EXECUTABLES: [&str; 8] = [
    "cmd.exe",
    "powershell.exe",
    "pwsh.exe",
    "wscript.exe",
    "cscript.exe",
    "mshta.exe",
    "rundll32.exe",
    "regsvr32.exe",
];

/// A conservative ASCII HTTPS URL proof. Unicode hosts must use their ASCII/Punycode form.
/// This validates a future system-browser action; it never opens a URL itself.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ValidatedHttpsUrl(String);

impl ValidatedHttpsUrl {
    pub fn parse(value: &str) -> Result<Self, PreflightError> {
        if value.is_empty() || value.len() > MAX_URL_LENGTH || !value.is_ascii() {
            return Err(invalid_url("HTTPS URL must be nonempty bounded ASCII text"));
        }
        if value.chars().any(|character| {
            character.is_control()
                || character.is_whitespace()
                || matches!(
                    character,
                    '\\' | '<' | '>' | '"' | '`' | '{' | '}' | '|' | '^'
                )
        }) {
            return Err(invalid_url(
                "HTTPS URL cannot contain whitespace, controls, or backslashes",
            ));
        }
        if value
            .as_bytes()
            .get(..HTTPS_PREFIX.len())
            .map(|prefix| !prefix.eq_ignore_ascii_case(HTTPS_PREFIX.as_bytes()))
            .unwrap_or(true)
        {
            return Err(invalid_url("only the HTTPS scheme is allowed"));
        }

        let remainder = &value[HTTPS_PREFIX.len()..];
        let authority_end = remainder.find(['/', '?', '#']).unwrap_or(remainder.len());
        let authority = &remainder[..authority_end];
        validate_authority(authority)?;
        validate_percent_encoding(&remainder[authority_end..])?;
        Ok(Self(value.to_owned()))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

/// Typed direct-process launch specification. std::process::Command never invokes a shell.
#[derive(Debug, Clone)]
pub struct ValidatedLaunch {
    executable: PathBuf,
    working_directory: PathBuf,
    arguments: Vec<String>,
}

impl ValidatedLaunch {
    pub fn new(
        executable: &Path,
        working_directory: &Path,
        arguments: Vec<String>,
    ) -> Result<Self, PreflightError> {
        let executable = canonical_existing(executable, "executable")?;
        if !executable.is_file() {
            return Err(invalid_launch("executable must be an existing file"));
        }
        #[cfg(windows)]
        if !executable
            .extension()
            .and_then(|value| value.to_str())
            .is_some_and(|value| value.eq_ignore_ascii_case("exe"))
        {
            return Err(invalid_launch(
                "Windows executable must have an .exe extension",
            ));
        }

        if let Some(file_name) = executable.file_name().and_then(|value| value.to_str()) {
            if DENIED_SHELL_EXECUTABLES
                .iter()
                .any(|denied| file_name.eq_ignore_ascii_case(denied))
            {
                return Err(invalid_launch(
                    "shell, script-host, and indirect-launch executables are not allowed",
                ));
            }
        }

        let working_directory = canonical_existing(working_directory, "working directory")?;
        if !working_directory.is_dir() {
            return Err(invalid_launch(
                "working directory must be an existing directory",
            ));
        }
        if arguments.iter().any(|argument| {
            argument.is_empty() || argument.len() > 32_000 || argument.chars().any(char::is_control)
        }) {
            return Err(invalid_launch(
                "arguments must be nonempty bounded strings without NUL or control characters",
            ));
        }

        Ok(Self {
            executable,
            working_directory,
            arguments,
        })
    }

    pub fn executable(&self) -> &Path {
        &self.executable
    }

    pub fn working_directory(&self) -> &Path {
        &self.working_directory
    }

    pub fn arguments(&self) -> &[String] {
        &self.arguments
    }

    /// Native-only proof helper. It is deliberately not registered as a Tauri command.
    pub fn run_and_wait(&self) -> Result<ExitStatus, PreflightError> {
        Command::new(&self.executable)
            .args(&self.arguments)
            .current_dir(&self.working_directory)
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .map_err(|_| {
                PreflightError::new(
                    PreflightErrorCode::ProcessLaunch,
                    "validated process could not be launched",
                )
            })
    }
}

fn validate_authority(authority: &str) -> Result<(), PreflightError> {
    if authority.is_empty() || authority.contains(['@', '%', '[', ']']) || authority.len() > 2_048 {
        return Err(invalid_url(
            "HTTPS authority cannot contain credentials, escapes, or ambiguous IP syntax",
        ));
    }

    let (host, port) = match authority.rsplit_once(':') {
        Some((host, port)) => {
            if host.contains(':') {
                return Err(invalid_url("ambiguous host and port separator"));
            }
            (host, Some(port))
        }
        None => (authority, None),
    };
    if let Some(port) = port {
        if port.is_empty() || !port.bytes().all(|byte| byte.is_ascii_digit()) {
            return Err(invalid_url("HTTPS port must contain only digits"));
        }
        let port = port
            .parse::<u16>()
            .map_err(|_| invalid_url("HTTPS port is outside the valid range"))?;
        if port == 0 {
            return Err(invalid_url("HTTPS port cannot be zero"));
        }
    }

    if host.is_empty() || host.len() > 253 || host.ends_with('.') {
        return Err(invalid_url("HTTPS host is empty or malformed"));
    }
    for label in host.split('.') {
        if label.is_empty()
            || label.len() > 63
            || label.starts_with('-')
            || label.ends_with('-')
            || !label
                .bytes()
                .all(|byte| byte.is_ascii_alphanumeric() || byte == b'-')
        {
            return Err(invalid_url("HTTPS host contains an invalid DNS label"));
        }
    }
    Ok(())
}

fn validate_percent_encoding(value: &str) -> Result<(), PreflightError> {
    let bytes = value.as_bytes();
    let mut index = 0;
    while index < bytes.len() {
        if bytes[index] != b'%' {
            index += 1;
            continue;
        }
        if index + 2 >= bytes.len()
            || !bytes[index + 1].is_ascii_hexdigit()
            || !bytes[index + 2].is_ascii_hexdigit()
        {
            return Err(invalid_url("URL contains malformed percent encoding"));
        }
        let decoded = (hex_digit(bytes[index + 1]) << 4) | hex_digit(bytes[index + 2]);
        if decoded < 0x20 || decoded == 0x7f || decoded == b'\\' {
            return Err(invalid_url("URL contains an encoded control or backslash"));
        }
        index += 3;
    }
    Ok(())
}

fn hex_digit(byte: u8) -> u8 {
    match byte {
        b'0'..=b'9' => byte - b'0',
        b'a'..=b'f' => byte - b'a' + 10,
        b'A'..=b'F' => byte - b'A' + 10,
        _ => 0,
    }
}

fn canonical_existing(path: &Path, role: &str) -> Result<PathBuf, PreflightError> {
    std::fs::canonicalize(path)
        .map_err(|_| invalid_launch(&format!("{role} must be an existing canonical path")))
}

fn invalid_url(message: &str) -> PreflightError {
    PreflightError::new(PreflightErrorCode::InvalidUrl, message)
}

fn invalid_launch(message: &str) -> PreflightError {
    PreflightError::new(PreflightErrorCode::InvalidLaunch, message)
}
