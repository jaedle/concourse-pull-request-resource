# Concourse Resource for Pull requests

As [telia-oss/github-pr-resource](https://github.com/telia-oss/github-pr-resource) is dead, this is a small rewrite of
the resource.

## API usage

This resource uses the GraphQL API of GitHub, so it should be faster than the REST API.

## Development

### Prerequisites

Install [mise-en-place](https://mise.jdx.dev/) for tool version management, then run:

```bash
mise install      # installs node 24 and go-task
npm ci            # install Node dependencies
```

### Available tasks

```bash
task build        # compile TypeScript to dist/
task test         # run all tests
task lint         # type-check without emitting files
```

### Running check/get locally

Build first, then pipe a JSON payload to the task:

```bash
task build

# check: returns new versions
echo '{"source":{"repository":"owner/repo","access_token":"ghp_..."}}' | task check-local

# get: clones and merges a PR into a destination directory
echo '{"source":{"repository":"owner/repo","access_token":"ghp_..."},"version":{"pr":"1","commit":"abc123","committed":"2024-01-01T00:00:00Z"}}' \
  | task get-local -- /tmp/pr-output
```

## Supported Actions

### check

Produces new versions for all commits (after the last version) ordered by the committed date. A version is represented
as follows:

- pr: The pull request number.
- commit: The commit SHA.
- committed: Timestamp of when the commit was committed. Used to filter subsequent checks.

### get

Clones the base (e.g. main branch) at the latest commit, and merges the pull request at the specified commit into
this branch.

### Example

```yaml
resource_types:
  - name: pull-request
    type: docker-image
    source:
      repository: jaedle/concourse-pull-request-resource

resources:
  - name: pull-request
    type: pull-request
    check_every: 30m
    source:
      repository: example/repository
      access_token: ((github-access-token))

jobs:
  - get: pull-request
    trigger: true
  - task: test
    config:
      platform: linux
      image_resource:
        type: docker-image
        source:
          repository: alpine/git
      input:
        - name: pull-request
      run:
        path: /bin/sh
        args:
          - cd pull-request/
          - git log
```

### Limitations

- no submodule support
- no support to change the integration tool: `rebase` is used by default
- no support for forks (is disabled by default)
- no path support
- no skip-ci support
- no dynamic configuration of the endpoints
- no configurable base branch, uses default branch
- no git lfs support