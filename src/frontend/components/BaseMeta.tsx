import { Outlet, type UIMatch, useMatches, useParams } from 'react-router-dom';
import type { RouteHandle } from '../types';

// This is your new "Base" Root
export default function BaseMeta() {
  const matches = useMatches() as UIMatch<unknown, RouteHandle>[];
  const params = useParams();

  // Find the metadata for the CURRENT route
  const lastMatch = [...matches]
    .reverse()
    .find(m => m.handle?.title || m.handle?.meta);
  const handle = lastMatch?.handle;

  const title =
    typeof handle?.title === 'function'
      ? handle.title(params)
      : handle?.title || 'Default Title';

  const meta = handle?.meta;
  const description =
    meta?.description || 'The ultimate retro monitoring dashboard.';

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      {meta?.canonical && <link rel="canonical" href={meta.canonical} />}

      {meta?.noIndex && <meta name="robots" content="noindex, nofollow" />}

      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={meta?.ogType || 'website'} />
      {meta?.ogImage && <meta property="og:image" content={meta.ogImage} />}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {meta?.ogImage && <meta name="twitter:image" content={meta.ogImage} />}

      <Outlet />
    </>
  );
}
