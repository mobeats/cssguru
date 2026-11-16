# Hermes CSSGuru Bridge (Beta)

This small user-level systemd service polls GitHub every 60 seconds.

## Accepted tasks

The worker processes only open issues in `mobeats/cssguru` when:
- the issue author is exactly `mobeats`;
- both labels `hermes-task` and `hermes-approved` are present;
- the issue is not already marked running, done, or error.

## Execution

Each issue is handled on a new branch based on `origin/main`. Hermes is invoked in one-shot mode with the `file`, `terminal`, and `code_execution` toolsets. The worker commits the resulting changes, pushes the branch, and opens a pull request against `main`. It never merges the pull request or deploys the website. The issue receives a German progress/result comment.

The service requires the local `gh` CLI to be authenticated as `mobeats`, and the local checkout at `/home/hermes/projects/cssguru`.

## Important beta security note

Hermes one-shot mode bypasses interactive approval prompts by design. The worker therefore accepts only issues authored by `mobeats` and explicitly labelled with both required labels. The Hermes process runs as the normal `hermes` Linux user and has that user's permissions. Do not add secrets or unrelated instructions to task issues. Review every pull request before merging.

## Install on the Raspberry Pi

Run as user `hermes` (not with sudo):

```sh
curl -fsSL https://raw.githubusercontent.com/mobeats/cssguru/hermes/bridge-setup/.hermes-bridge/install.sh | sh
```

The installer downloads the worker and enables a user systemd service. User lingering is expected to be enabled.

## Service controls

```sh
systemctl --user status hermes-cssguru-bridge
journalctl --user -u hermes-cssguru-bridge -f
systemctl --user stop hermes-cssguru-bridge
systemctl --user start hermes-cssguru-bridge
systemctl --user disable --now hermes-cssguru-bridge
```
