use std::sync::mpsc::{channel, Receiver, RecvTimeoutError, TryRecvError};
use std::time::Duration;

use notify::{RecommendedWatcher, RecursiveMode, Watcher};

use crate::error::{PreflightError, PreflightErrorCode};
use crate::filesystem::path::RegisteredRoot;

/// Events and errors both request reconciliation; neither establishes content state or deletion.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WatchHint {
    EventReceived,
    WatcherError,
}

pub struct RootWatcher {
    // Keeping the watcher alive is sufficient; OS events arrive without a polling loop.
    _watcher: RecommendedWatcher,
    receiver: Receiver<WatchHint>,
}

impl RootWatcher {
    pub fn watch_recursive(root: &RegisteredRoot) -> Result<Self, PreflightError> {
        let (sender, receiver) = channel();
        let mut watcher =
            notify::recommended_watcher(move |result: notify::Result<notify::Event>| {
                let _ = sender.send(classify_notification(result));
            })
            .map_err(|_| watcher_error("failed to initialize the filesystem watcher"))?;
        watcher
            .watch(root.path(), RecursiveMode::Recursive)
            .map_err(|_| watcher_error("failed to watch the registered root recursively"))?;
        Ok(Self {
            _watcher: watcher,
            receiver,
        })
    }

    pub fn recv_timeout(&self, timeout: Duration) -> Result<WatchHint, RecvTimeoutError> {
        self.receiver.recv_timeout(timeout)
    }

    pub fn try_recv(&self) -> Result<WatchHint, TryRecvError> {
        self.receiver.try_recv()
    }
}

pub fn classify_notification(result: notify::Result<notify::Event>) -> WatchHint {
    match result {
        Ok(_) => WatchHint::EventReceived,
        Err(_) => WatchHint::WatcherError,
    }
}

fn watcher_error(message: &str) -> PreflightError {
    PreflightError::new(PreflightErrorCode::Watcher, message)
}
