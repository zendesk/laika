# apollo-testing-toolkit-link

Test, mock, intercept and modify Apollo Client's operations.

![Example recording output](./media/example-recording.png)

## Features

- **mock** responses in either unit tests or browser tests (think Puppeteer or Cypress)
  - simulate error state
  - simulate loading state
  - simulate subscriptions (pushing data to the client at any given point)
- it can work in production code without affecting the size of the bundle (the toolkit is lazily loaded)
- captures the variables that were called for a given operation for assertions
- **log** all the data passing through from the network (or whatever Links are after this one)
- **record** your user story
- **generate fixtures and working mock code** for use in your tests
- **modify** backend responses before they reach your components (e.g. to fuzz-test unexpected behavior)

## Usage

- [How to install](https://zendesk.github.io/apollo-testing-toolkit-link/docs/how-to-install)
- [Usage in Cypress](https://zendesk.github.io/apollo-testing-toolkit-link/docs/usage-in-cypress)
- [Logging and recording](https://zendesk.github.io/apollo-testing-toolkit-link/docs/logging-and-recording)
- [Pitfalls](https://zendesk.github.io/apollo-testing-toolkit-link/docs/pitfalls)
- [API reference](https://zendesk.github.io/apollo-testing-toolkit-link/docs/modules/ApolloTestingToolkit)

## Alternatives

- [`MockedProvider`](https://www.apollographql.com/docs/react/development-testing/testing/) - the official Apollo mocking tool designed for unit tests; offers no subscription mocking or recording functionality

## Contribution

Thanks for your interest in our tool! Community involvement helps make our
design system fresh and tasty for everyone.

Got issues with what you find here? Please feel free to create an
[issue](https://github.com/zendesk/apollo-testing-toolkit-link/issues/new).

If you'd like to take a crack at making some changes, please follow our
[contributing](https://github.com/zendesk/apollo-testing-toolkit-link/blob/main/.github/CONTRIBUTING.md) documentation for details
needed to submit a PR.

Community behavior is benevolently ruled by a [code of
conduct](https://github.com/zendesk/apollo-testing-toolkit-link/blob/main/.github/CODE_OF_CONDUCT.md). Please participate accordingly.

## License

Copyright 2021 Zendesk

Licensed under the [Apache License, Version 2.0](https://www.apache.org/licenses/LICENSE-2.0.txt)
