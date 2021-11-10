import { createLazyLoadableLink } from './createLazyLoadableLink'
import type { CreateTestingToolkitLinkOptions } from './typedefs'

/**
 * Creates a lazy-loadable Apollo Testing Toolkit Link.
 * Useful when you want to use the Testing Toolkit Link in a production environment conditionally,
 * i.e. only load it when necessary.
 */
export const createLazyLoadableTestingToolkitLink = (
  options: CreateTestingToolkitLinkOptions,
) =>
  createLazyLoadableLink(
    import(
      './createGlobalTestingToolkitLink' /* webpackChunkName: 'apolloTestingToolkitLink' */
    ).then(({ createGlobalTestingToolkitLink }) =>
      createGlobalTestingToolkitLink(options),
    ),
  )
