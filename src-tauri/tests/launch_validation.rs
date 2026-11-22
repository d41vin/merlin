use std::fs;
use std::path::PathBuf;

use merlin::error::AppErrorCode;
use merlin::services::launch::{ValidatedHttpsUrl, ValidatedLaunch};

#[test]
fn https_validation_accepts_only_unambiguous_https_urls() {
    for valid in [
        "https://example.com",
        "HTTPS://EXAMPLE.COM/path",
        "https://localhost:443/path?x=1&y=2#fragment",
        "https://xn--bcher-kva.example/resource%20name",
    ] {
        assert!(
            ValidatedHttpsUrl::parse(valid).is_ok(),
            "valid URL rejected: {valid}"
        );
    }

    for invalid in [
        "http://example.com",
        "file:///C:/secret",
        "javascript:alert(1)",
        "https://user:password@example.com",
        "https://user@example.com",
        "https://%65xample.com",
        "https://example.com\\@evil.example",
        "https://example.com/%5cevil",
        "https://example.com/%00",
        "https://example.com/%1f",
        "https://example.com/a b",
        "https://example.com/\n",
        "https://example.com:0",
        "https://example.com:65536",
        "https://example.com:not-a-port",
        "https://example.com/%zz",
        "https://example..com",
        "https://-example.com",
        "https://[::1]",
        "//example.com",
        "",
    ] {
        let error = ValidatedHttpsUrl::parse(invalid).expect_err("unsafe URL accepted");
        assert_eq!(error.code, AppErrorCode::InvalidUrl);
    }
}

#[test]
fn executable_working_directory_and_arguments_are_validated() {
    let directory = tempfile::tempdir().expect("temporary directory");
    let executable_path = directory.path().join("synthetic.exe");
    fs::write(&executable_path, b"not executed").expect("synthetic executable fixture");
    let working_directory = directory.path().join("working");
    fs::create_dir(&working_directory).expect("working directory");

    let launch = ValidatedLaunch::new(
        &executable_path,
        &working_directory,
        vec!["literal&not-a-shell-operator".to_owned()],
    )
    .expect("direct argument array should allow literal shell punctuation");
    assert!(launch.executable().is_absolute());
    assert!(launch.working_directory().is_absolute());
    assert_eq!(launch.arguments().len(), 1);

    for bad_argument in [
        "contains\0nul".to_owned(),
        "contains\nnewline".to_owned(),
        String::new(),
    ] {
        let error = ValidatedLaunch::new(&executable_path, &working_directory, vec![bad_argument])
            .expect_err("unsafe argument accepted");
        assert_eq!(error.code, AppErrorCode::InvalidLaunch);
    }

    assert!(ValidatedLaunch::new(
        &directory.path().join("missing.exe"),
        &working_directory,
        Vec::new()
    )
    .is_err());
    assert!(ValidatedLaunch::new(&executable_path, &executable_path, Vec::new()).is_err());
}

#[cfg(windows)]
#[test]
fn direct_launch_proof_runs_only_a_harmless_system_executable() {
    let windir = std::env::var_os("WINDIR").expect("Windows directory");
    let executable = PathBuf::from(windir).join("System32").join("whoami.exe");
    if !executable.exists() {
        eprintln!("direct process proof skipped because whoami.exe is unavailable");
        return;
    }
    let launch = ValidatedLaunch::new(
        &executable,
        executable.parent().expect("System32 parent"),
        vec!["/?".to_owned()],
    )
    .expect("validated system executable");
    let status = launch.run_and_wait().expect("harmless process status");
    assert!(status.success());
}

#[cfg(windows)]
#[test]
fn shell_interpreters_are_rejected() {
    let windir = std::env::var_os("WINDIR").expect("Windows directory");
    let executable = PathBuf::from(windir).join("System32").join("cmd.exe");
    if !executable.exists() {
        return;
    }
    let error = ValidatedLaunch::new(
        &executable,
        executable.parent().expect("System32 parent"),
        vec!["/c".to_owned(), "echo should-not-run".to_owned()],
    )
    .expect_err("shell interpreter accepted");
    assert_eq!(error.code, AppErrorCode::InvalidLaunch);
}
