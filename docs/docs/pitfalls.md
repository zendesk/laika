---
id: 'pitfalls'
title: 'Pitfalls'
sidebar_label: 'Pitfalls'
custom_edit_url: null
hide_title: true
---

# Pitfalls

## Interceptor specificity vs ordering

Every interceptor you create should be as specific as needed in a given session. At the very least, ensure the order of creating interceptors is from most specific, to least specific.

This is because any operations that are executed by your client will end up being intercepted
by the **first** interceptor that matches the constraints of the [*Matcher*](api/modules/typedefs#matcher).

To ilustrate, think about what would happen if you did this:

```ts
const absolutelyEverythingInterceptor = apolloTestingToolkit.intercept(/* no constraints */);

const onlyActiveUsersInterceptor = apolloTestingToolkit.intercept({
  clientName: 'users',
  operationName: 'getActiveUsers',
});

// this will not work:
onlyActiveUsersInterceptor.mockResultOnce(
  {result: {data: {users: [{id: 1, name: 'Mouse'}, {id: 2, name: 'Bamboo'}]}}},
);
```

Now, say a React component with `useQuery(getActiveUsersQuery)` is mounted.
Our mocked result will not end up being sent to the React component.
Why? Because the first interceptor that satisfied all constraints (i.e. *none*),
was actually `absolutelyEverythingInterceptor`.

Since we haven't configured any behavior for this interceptor, it will passthrough
the request to the backend.

However if you'd reverse the order of creation of each intercept, this would work correctly.
