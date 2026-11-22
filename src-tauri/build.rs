use std::path::Path;

fn main() {
    println!("cargo:rerun-if-changed=migrations");
    println!("cargo:rerun-if-env-changed=MERLIN_TEST_HARNESS_BUILD");

    let production = std::env::var_os("CARGO_FEATURE_PRODUCTION").is_some();
    let custom_protocol = std::env::var_os("CARGO_FEATURE_CUSTOM_PROTOCOL").is_some();
    let harness = std::env::var_os("CARGO_FEATURE_TEST_HARNESS").is_some();

    if production && harness {
        panic!("test-harness cannot be enabled in a production build");
    }
    if production && !custom_protocol {
        panic!("production builds require the explicit custom-protocol feature");
    }
    if !production
        && !harness
        && std::env::var_os("PROFILE").as_deref() == Some(std::ffi::OsStr::new("release"))
    {
        panic!("release builds must explicitly select custom-protocol,production or the authorized test-harness build");
    }

    if harness {
        if std::env::var_os("MERLIN_TEST_HARNESS_BUILD").as_deref()
            != Some(std::ffi::OsStr::new("1"))
        {
            panic!("test-harness compilation requires the explicit harness build wrapper");
        }

        if std::env::var_os("PROFILE").as_deref() == Some(std::ffi::OsStr::new("release")) {
            let manifest_directory = std::env::var_os("CARGO_MANIFEST_DIR")
                .expect("Cargo provides the package manifest directory");
            let expected_target = Path::new(&manifest_directory)
                .join("target")
                .join("test-harness");
            let output_directory = std::env::var_os("OUT_DIR")
                .expect("Cargo provides the build-script output directory");
            if !Path::new(&output_directory).starts_with(expected_target) {
                panic!("release test-harness builds require the separate test-harness target directory");
            }
        }
    }

    tauri_build::build()
}
