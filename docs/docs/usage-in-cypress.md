---
id: 'usage-in-cypress'
title: 'Usage in Cypress'
sidebar_label: 'Usage in Cypress'
custom_edit_url: null
hide_title: true
---

# Usage in Cypress

Due to Cypress execution order, you need to wrap any calls to the interceptors with `cy.then()`.

For example:

```ts
describe('My suite', () => {
  /** @type {import('@zendesk/laika').Laika} */
  let laika

  before(() => {
    cy.visit('/')
    cy.window()
      .its('laika')
      .then((instance) => {
        // this looks like a code smell, but it isn't
        // instance will not change and we will only use it inside future `then`s
        // by that time the variable will have been set!
        laika = instance
      })
  })

  it('waits for the subscription, pushes out data and asserts the element updated', () => {
    /** @type {import('@zendesk/laika').InterceptApi} */
    let getActiveUsersInterceptor

    cy.then(() => {
      getActiveUsersInterceptor = laika.intercept({
        clientName: 'users',
        operationName: 'getActiveUsers',
      })
    })

    cy.then({ timeout: 5000 }, async () => {
      await getActiveUsersInterceptor.waitForActiveSubscription()
      getActiveUsersInterceptor.fireSubscriptionUpdate({
        result: { data: { count: 10 } },
      })
    })

    cy.get('activeUsers').contains(
      'There are 10 users currently active on the website',
    )
  })
})
```

## Pitfall: Data that comes outside of Apollo

With all the ease that [recording and code generation](logging-and-recording.md) gives,
it might be easy to forget that there might be other sources of data on the path to success.

If you've set-up all the mocks that were captured and your application
still doesn't behave as expected, check the network tab to see
if there ain't any good 'ol REST call in the way of our success!

If yes, and they look relevant to your action, you might need to make another mock for this purpose.
Fortunately, Cypress provides us with the necessary built-in tools to move forward.

```js
// setup:
cy.intercept(`**/api/v2/tickets/${issueId}?**`, myJsonFixtureResponse).as(
  'issueFetch',
)

// wait for the call (if necessary):
cy.wait('@issueFetch')
```
