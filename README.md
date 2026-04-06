# Concourse Resource for Pull requests

As [telia-oss/github-pr-resource](https://github.com/telia-oss/github-pr-resource) is dead, this is a small rewrite of
the resource.

## API usage

This resource uses the GraphQL API of GitHub, so it should be faster than the REST API.

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