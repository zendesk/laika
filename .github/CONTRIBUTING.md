# Contributing

Keen to contribute? We're stoked to have you join us. You may
find that opening an
[issue](https://github.com/zendesk/apollo-testing-toolkit-link/issues) is the
best way to get a conversation started. When you're ready to submit a
pull request, follow the [steps](#pull-request-workflow) below. We
follow a [code of conduct](CODE_OF_CONDUCT.md) as our guide for
community behavior.

## Versioning Workflow

apollo-testing-toolkit-link follows [semantic versioning](https://semver.org/). We release
patch versions for bugfixes, minor versions for new features, and major
versions for any breaking changes.

The [pull request workflow](#pull-request-workflow) will help us determine how to
version your contributions.

All changes are recorded in the [changelog](/CHANGELOG.md) after your PR is
merged.

## Development Workflow

Before you start, be sure [yarn](https://yarnpkg.com/en/) is installed
on your system. After you clone this repo, run `yarn` to install
dependencies needed for development. After installation, the following
commands are available:

- `yarn test` to run all lints and tests.
- `yarn build` to build distributions

## Pull Request Workflow

1. Fork the repo and create a branch. Format your branch name as
   `username/verb-noun`.
1. If you haven't yet, get comfortable with the [development
   environment](#development-workflow).
1. Regularly `git commit` locally and `git push` to the remote branch.
   Use whatever casual commit messaging you find suitable. We'll help
   you apply an appropriate squashed [conventional
   commit](https://conventionalcommits.org/) message when it's time to
   merge to the main branch.
1. If your changes result in a major modification, be sure all
   documentation is up-to-date.
1. When your branch is ready, open a new pull request via GitHub.
1. Every PR must pass CI checks and receive at least one :+1: to be
   considered for merge.
1. apollo-testing-toolkit-link maintainers will manage the squashed merge to the main branch, using your PR title and description as the scope, description, and body for a conventional commit.

## License

By contributing to apollo-testing-toolkit-link, you agree that your contributions will be licensed under the [Apache License, Version 2.0](/LICENSE.md).
