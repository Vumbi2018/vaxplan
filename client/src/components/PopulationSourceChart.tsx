import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface PopulationSource {
  source: string;
  population: number;
  confidence: number;
  year: number;
}

interface PopulationSourceChartProps {
  data: PopulationSource[];
  consensusPopulation?: number;
}

const sourceColors: Record<string, string> = {
  census: "hsl(var(--chart-1))",
  health_registry: "hsl(var(--chart-2))",
  worldpop: "hsl(var(--chart-3))",
  remote_sensing: "hsl(var(--chart-4))",
  local_survey: "hsl(var(--chart-5))",
};

const sourceLabels: Record<string, string> = {
  census: "National Census",
  health_registry: "Health Registry",
  worldpop: "WorldPop Model",
  remote_sensing: "Remote Sensing",
  local_survey: "Local Survey",
};

export function PopulationSourceChart({
  data,
  consensusPopulation,
}: PopulationSourceChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    label: sourceLabels[d.source] || d.source,
    color: sourceColors[d.source] || "hsl(var(--muted))",
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Population Data Sources</CardTitle>
        {consensusPopulation && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-muted-foreground">Consensus Estimate:</span>
            <Badge variant="secondary" className="text-lg font-semibold">
              {consensusPopulation.toLocaleString()}
            </Badge>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-64 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" tickFormatter={(v) => v.toLocaleString()} />
              <YAxis
                dataKey="label"
                type="category"
                width={120}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(value: number) => [value.toLocaleString(), "Population"]}
                labelFormatter={(label) => label}
              />
              <Bar dataKey="population" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">
            Confidence Scores
          </h4>
          {chartData.map((item) => (
            <div key={item.source} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span>{item.label}</span>
                <span className="text-muted-foreground">
                  {item.confidence}% ({item.year})
                </span>
              </div>
              <Progress value={item.confidence} className="h-2" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
