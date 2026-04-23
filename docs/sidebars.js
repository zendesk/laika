// eslint-disable-next-line import/no-commonjs
module.exports = {
  docsSidebar: [
    {
      type: 'category',
      label: 'Guides',
      items: [
        {
          type: 'doc',
          id: 'readme',
          label: 'Home',
        },
        'how-to-install',
        'loading-laika-conditionally',
        'testing-approach',
        'usage-in-playwright',
        'usage-in-jest-vitest',
        'usage-in-cypress',
        'advanced-usage',
        'resetting-between-tests',
        'logging-and-recording',
        'pitfalls',
      ],
    },
    {
      type: 'category',
      label: 'Core APIs',
      items: [
        'api/Laika/classes/Laika',
        'api/Laika/classes/InterceptApi',
        'api/Laika/classes/LogApi',
      ],
    },
    {
      type: 'category',
      label: 'API reference',
      items: [
        {
          type: 'category',
          label: 'Package root',
          link: {
            type: 'doc',
            id: 'api/index',
          },
          items: [
            {
              type: 'category',
              label: 'Type aliases',
              items: [
                'api/@zendesk/laika/type-aliases/FetchResult',
                'api/@zendesk/laika/type-aliases/Operation',
              ],
            },
          ],
        },
        {
          type: 'category',
          label: 'createGlobalLaikaLink',
          link: {
            type: 'doc',
            id: 'api/createGlobalLaikaLink/index',
          },
          items: [
            {
              type: 'category',
              label: 'Variables',
              items: ['api/createGlobalLaikaLink/variables/getLaikaSingleton'],
            },
            {
              type: 'category',
              label: 'Functions',
              items: [
                'api/createGlobalLaikaLink/functions/createGlobalLaikaLink',
              ],
            },
          ],
        },
        {
          type: 'category',
          label: 'createLazyLoadableLaikaLink',
          link: {
            type: 'doc',
            id: 'api/createLazyLoadableLaikaLink/index',
          },
          items: [
            {
              type: 'category',
              label: 'Functions',
              items: [
                'api/createLazyLoadableLaikaLink/functions/createLazyLoadableLaikaLink',
              ],
            },
          ],
        },
        {
          type: 'category',
          label: 'createLazyLoadableLink',
          link: {
            type: 'doc',
            id: 'api/createLazyLoadableLink/index',
          },
          items: [
            {
              type: 'category',
              label: 'Functions',
              items: [
                'api/createLazyLoadableLink/functions/createLazyLoadableLink',
              ],
            },
          ],
        },
        {
          type: 'category',
          label: 'Laika',
          link: {
            type: 'doc',
            id: 'api/Laika/index',
          },
          items: [
            {
              type: 'category',
              label: 'Classes',
              items: [
                'api/Laika/classes/InterceptApi',
                'api/Laika/classes/Laika',
                'api/Laika/classes/LogApi',
              ],
            },
          ],
        },
        {
          type: 'category',
          label: 'typedefs',
          link: {
            type: 'doc',
            id: 'api/typedefs/index',
          },
          items: [
            {
              type: 'category',
              label: 'Interfaces',
              items: [
                'api/typedefs/interfaces/Behavior',
                'api/typedefs/interfaces/CreateLaikaLinkOptions',
                'api/typedefs/interfaces/MatcherObject',
                'api/typedefs/interfaces/RecordingMarker',
                'api/typedefs/interfaces/RecordingPoint',
                'api/typedefs/interfaces/RecordingPointWithFixtureData',
                'api/typedefs/interfaces/RecordingPointWithFixtureMeta',
                'api/typedefs/interfaces/Result',
                'api/typedefs/interfaces/SubscribeMeta',
              ],
            },
            {
              type: 'category',
              label: 'Type aliases',
              items: [
                'api/typedefs/type-aliases/EventFilterFn',
                'api/typedefs/type-aliases/InterceptorFn',
                'api/typedefs/type-aliases/ManInTheMiddleFn',
                'api/typedefs/type-aliases/Matcher',
                'api/typedefs/type-aliases/MatcherFn',
                'api/typedefs/type-aliases/OnSubscribe',
                'api/typedefs/type-aliases/OnSubscribeCallback',
                'api/typedefs/type-aliases/OperationObserverCallback',
                'api/typedefs/type-aliases/PassthroughDisableFn',
                'api/typedefs/type-aliases/PassthroughEnableFn',
                'api/typedefs/type-aliases/RecordingElement',
                'api/typedefs/type-aliases/RecordingElementWithFixtureData',
                'api/typedefs/type-aliases/RecordingElementWithFixtureMeta',
                'api/typedefs/type-aliases/Replacements',
                'api/typedefs/type-aliases/ResultFn',
                'api/typedefs/type-aliases/ResultOrFn',
              ],
            },
          ],
        },
      ],
    },
  ],
}
