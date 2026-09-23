import type { Metadata } from "next";
import SeriesDetailPage, {
  generateSeriesMetadata,
} from "@/components/SeriesDetailPage";

type RootSeriesPageProps = {
  params: Promise<{ series: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: RootSeriesPageProps): Promise<Metadata> {
  const { series } = await params;
  return generateSeriesMetadata(series);
}

export default async function RootSeriesPage({
  params,
  searchParams,
}: RootSeriesPageProps) {
  const { series } = await params;

  return (
    <SeriesDetailPage
      requestedAlias={series}
      searchParams={searchParams}
      redirectLegacyBooks
    />
  );
}
