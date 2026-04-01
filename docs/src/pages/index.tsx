import React from 'react'
import type { ReactNode } from 'react'
import clsx from 'clsx'
import Link from '@docusaurus/Link'
import useBaseUrl from '@docusaurus/useBaseUrl'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import Layout from '@theme/Layout'
import styles from './styles.module.css'

type FeatureItem = {
  title: string
  imageUrl: string
  description: ReactNode
}

const features: FeatureItem[] = [
  {
    title: 'Easy to Learn',
    imageUrl: 'img/undraw_docusaurus_mountain.svg',
    description: (
      <>
        Laika&apos;s API is modelled on <code>jest</code>. Since many frontend
        engineers are already familiar with that style, the learning curve stays
        shallow.
      </>
    ),
  },
  {
    title: 'Logilicious',
    imageUrl: 'img/undraw_docusaurus_tree.svg',
    description: (
      <>
        Inspect GraphQL requests, responses, and subscriptions as they happen,
        along with the variables that produced them.
      </>
    ),
  },
  {
    title: 'Focus on What Matters',
    imageUrl: 'img/undraw_docusaurus_react.svg',
    description: (
      <>
        Spend less time hand-authoring fixtures and more time describing user
        scenarios, edge cases, and live updates.
      </>
    ),
  },
]

function Feature({ imageUrl, title, description }: FeatureItem) {
  const imgUrl = useBaseUrl(imageUrl)

  return (
    <div className={clsx('col col--4', styles.feature)}>
      <div className="text--center">
        <img className={styles.featureImage} src={imgUrl} alt={title} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  )
}

export default function Home(): React.JSX.Element {
  const context = useDocusaurusContext()
  const { siteConfig } = context
  const logoUrl = useBaseUrl('img/logo-full.svg')

  return (
    <Layout
      title={`The only Apollo Client mocking tool you need - ${siteConfig.title}`}
      description="Test, mock, intercept and modify Apollo Client's operations in browser and unit tests."
    >
      <header className={clsx('hero hero--primary', styles.heroBanner)}>
        <div className="container">
          <h1 className="hero__title">
            <img src={logoUrl} alt={siteConfig.title} />
          </h1>
          <p className="hero__subtitle">{siteConfig.tagline}</p>
          <div className={styles.buttons}>
            <Link
              className={clsx(
                'button button--outline button--secondary button--lg',
              )}
              to={useBaseUrl('/docs/')}
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>
      <main>
        <section className={styles.features}>
          <div className="container">
            <div className="row">
              {features.map((feature) => (
                <Feature key={feature.title} {...feature} />
              ))}
            </div>
          </div>
        </section>
      </main>
    </Layout>
  )
}
