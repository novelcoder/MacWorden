import { notFound, permanentRedirect } from "next/navigation";
import { getMacAttributionContext } from "@/lib/attribution";
import { ATTRIBUTION_QUERY_PARAM, withAttribution } from "@/lib/attribution-routing";
import { getSeriesCatalog } from "@/lib/appwrite";
import { seriesCanonicalPath, seriesMatchesRouteAlias } from "@/lib/catalog-routing";

export default async function LegacySeriesRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { slug } = await params;
  const catalog = await getSeriesCatalog().catch(() => []);
  const matches = catalog.filter(({ series }) => seriesMatchesRouteAlias(series, slug));

  if (matches.length !== 1) notFound();

  const query = await searchParams;
  const attribution = await getMacAttributionContext(
    query[ATTRIBUTION_QUERY_PARAM],
    catalog.flatMap(({ books }) => books)
  );

  permanentRedirect(
    withAttribution(seriesCanonicalPath(matches[0].series), attribution?.sourceKey ?? null)
  );
}
