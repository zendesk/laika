import { createLazyLoadableLink } from './createLazyLoadableLink'
import type { CreateLaikaLinkOptions } from './typedefs'

/**
 * Creates a lazy-loadable Laika Link.
 * Useful when you want to use Laika Link in a production environment conditionally,
 * i.e. only load it when necessary.
 */
export const createLazyLoadableLaikaLink = (options: CreateLaikaLinkOptions) =>
  createLazyLoadableLink(
    import(
      './createGlobalLaikaLink' /* webpackChunkName: 'apolloLaikaLink' */
    ).then(({ createGlobalLaikaLink }) => createGlobalLaikaLink(options)),
  )
