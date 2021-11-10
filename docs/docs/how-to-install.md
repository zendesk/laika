---
id: 'how-to-install'
title: 'How to install in your project'
sidebar_label: 'How to install in your project'
custom_edit_url: null
hide_title: true
---

# How to install in your project

## Installing the package

First you'll need to use your package manager to add Laika to your project.

```shell
$ npm install --save @zendesk/laika
# or if using yarn:
$ yarn add @zendesk/laika
```

Note that if you do not intend to use Laika for testing production code, you can use the `--save-dev` flag (or `--dev` in case of `yarn`) to install it as a development dependency.

## Loading the Laika Link in your project

For tests that run on your production code, you'll likely want to load the link conditionally, so that it is not downloaded by your users, but only in certain scenarios, e.g. inside of your browser test runner.

Include the link wherever you like in your chain of links, however we recommend putting it right before the connection with the backend occurs for most accurate results.

```js
import { createLazyLoadableLaikaLink } from '@zendesk/laika'

const apolloClient = new ApolloClient({
  link: ApolloLink.from([
    new YourCustomLink(),
    ...(process.env.NODE_ENV === 'development'
      ? [
          createLazyLoadableLaikaLink({
            clientName: 'your-client-name',
            startLoggingImmediately: true,
          }),
        ]
      : []),
    new HttpLink(/* ... */),
  ]),
  // ...
})
```

### Customizing loading of the Link

By default, link is lazily loaded and if you use webpack, split into a seaprate chunk by utilizing the `createLazyLoadableLink` function provided in the package.

You may customize this behavior. This is the default behavior:

```js
import { createLazyLoadableLink } from '@zendesk/laika'

/**
 * @param {{clientName: string}} options
 */
export const createLazyLoadableLaikaLink = (options) =>
  createLazyLoadableLink(
    import(
      '@zendesk/laika' /* webpackChunkName: 'apolloLaikaLink' */
    ).then(({ createInterceptingLink }) => createInterceptingLink(options)),
  )
```

If you're using webpack, the `webpackChunkName` magic comment will ensure a separate chunk is file created for the link.

## Loading the Link in unit tests

If you have full control over the Apollo client inside of your tests, you may directly create the Link from an instance of Laika:

```typescript
import { Laika } from "@zendesk/laika/esm/laika"

const laika = new Laika()

const link = from([
  laika.createLink(),
  new HttpLink({ uri: "..." })
])

it('works', () => {
  // setup your test, for example:
  const interceptor = laika.intercept()
  interceptor.mockResultOnce({
    result: {
      data: {/* ... */},
    }
  })
  // run some assertions
  // ...
})
```

Note that Laika itself isn't directly exported from `@zendesk/laika` in order to minimize the amount of data that is bundled with your application when using lazily loaded Laika in production.

## What can I import from the module?

See the [API reference](api/modules.md).

## What next?

Read about how to use the library in [Laika](api/modules/Laika.md).
