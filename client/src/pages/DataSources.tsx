import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  Map as MapIcon,
  Layers,
  Users,
  Building2,
  Syringe,
  Code2,
  ExternalLink,
  Heart,
} from "lucide-react";
import type { Tenant } from "@shared/schema";
import {
  dataSourceCategories,
  acknowledgements,
  type DataSource,
} from "@/data/dataSources";

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  maps: MapIcon,
  boundaries: Layers,
  population: Users,
  facilities: Building2,
  guidance: Syringe,
  software: Code2,
};

function SourceRow({ source }: { source: DataSource }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground">{source.name}</span>
            {source.license && (
              <Badge variant="secondary" className="text-[10px] font-normal">
                {source.license}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{source.description}</p>
        </div>
        {source.url && (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-primary hover:underline inline-flex items-center gap-1 text-sm"
            data-testid={`link-source-${source.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
          >
            Visit
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}

export default function DataSources() {
  const { data: tenant } = useQuery<Tenant>({
    queryKey: ["/api/me/tenant"],
    retry: false,
  });

  const settings = (tenant?.settings as any) || {};
  const populationSources: { code: string; label: string }[] =
    settings.populationSources || [];
  const countryName = tenant?.name;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6" data-testid="page-data-sources">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Database className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Data Sources &amp; Acknowledgements
            </h1>
            <p className="text-sm text-muted-foreground">
              Where VaxPlan's maps, boundaries, population figures, and facility
              data come from — and the open projects that make it possible.
            </p>
          </div>
        </div>
      </div>

      {/* Per-tenant population sources */}
      {populationSources.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Population sources for {countryName || "your country"}
            </CardTitle>
            <CardDescription>
              These are the population data sources configured for your country
              and used in catchment and vaccine-needs calculations.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {populationSources.map((s) => (
              <Badge
                key={s.code}
                variant="outline"
                className="text-sm py-1 px-3"
                data-testid={`badge-popsource-${s.code}`}
              >
                {s.label}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Categories */}
      {dataSourceCategories.map((cat) => {
        const Icon = categoryIcons[cat.id] || Database;
        return (
          <Card key={cat.id} data-testid={`category-${cat.id}`}>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Icon className="h-5 w-5 text-primary" />
                {cat.title}
              </CardTitle>
              <CardDescription>{cat.blurb}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              {cat.sources.map((source) => (
                <SourceRow key={source.name} source={source} />
              ))}
            </CardContent>
          </Card>
        );
      })}

      {/* Acknowledgements */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            Acknowledgements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {acknowledgements.map((line, i) => (
            <p key={i} className="text-sm text-muted-foreground leading-relaxed">
              {line}
            </p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
