---
id: 'how-to-install'
title: 'How to install in your project'
sidebar_label: 'How to install in your project'
custom_edit_url: null
hide_title: true
---

# How to install in your project

You'll likely want to load the link conditionally, so that it is not downloaded by your clients.
Include the link wherever you like in your chain, however I recommend putting it right before the connection with the backend occurs for most accurate results.

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

### Customizing loading of the link

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

The `webpackChunkName` magic comment will ensure a separate chunk is file created for the link (if you're using webpack).

## What can I import from the module?

See the [API reference](api/modules.md).

## What next?

Read about how to use the library in [Laika](api/modules/Laika.md).
