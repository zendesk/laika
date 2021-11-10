import React from 'react'
import clsx from 'clsx'
import Link from '@docusaurus/Link'
import useBaseUrl from '@docusaurus/useBaseUrl'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import Layout from '@theme/Layout'
import styles from './styles.module.css'

const features = [
  {
    title: 'Easy to Learn',
    imageUrl: 'img/undraw_docusaurus_mountain.svg',
    description: (
      <>
        Laika's API is modelled on <code>jest</code>. Since many Frontend
        Engineers are familiar with it and that should make it easier to learn!
      </>
    ),
  },
  {
    title: 'Logilicious 😋',
    imageUrl: 'img/undraw_docusaurus_tree.svg',
    description: (
      <>
        Understand what requests and subscriptions are being made, along with
        what variables at any given time.
      </>
    ),
  },
  {
    title: 'Focus on What Matters',
    imageUrl: 'img/undraw_docusaurus_react.svg',
    description: (
      <>
        Laika lets you focus on your tests, not writing fixtures or figuring out
        what data is being sent by the backend in a websocket subscription 🙈.
      </>
    ),
  },
]

function Feature({ imageUrl, title, description }) {
  const imgUrl = useBaseUrl(imageUrl)
  return (
    <div className={clsx('col col--4', styles.feature)}>
      {imgUrl && (
        <div className="text--center">
          <img className={styles.featureImage} src={imgUrl} alt={title} />
        </div>
      )}
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  )
}

function Home() {
  const imgUrl = useBaseUrl('img/logo-full.svg')
  const context = useDocusaurusContext()
  const { siteConfig = {} } = context
  return (
    <Layout
      title={`Hello from ${siteConfig.title}`}
      description="Test, mock, intercept and modify Apollo Client's operations"
    >
      <header className={clsx('hero hero--primary', styles.heroBanner)}>
        <div className="container">
          <h1 className="hero__title">
            <img src={imgUrl} alt={siteConfig.title} />
          </h1>
          <p className="hero__subtitle">{siteConfig.tagline}</p>
          <div className={styles.buttons}>
            <Link
              className={clsx(
                'button button--outline button--secondary button--lg',
                styles.getStarted,
              )}
              to={useBaseUrl('docs/api')}
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>
      <main>
        {features && features.length > 0 && (
          <section className={styles.features}>
            <div className="container">
              <div className="row">
                {features.map((props, idx) => (
                  <Feature key={idx} {...props} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </Layout>
  )
}

export default Home
