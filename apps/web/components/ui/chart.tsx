"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";
import { cn } from "@/lib/utils";

const THEMES = {
  light: "",
  dark: ".dark",
} as const;

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    icon?: React.ComponentType<{ className?: string }>;
    color?: string;
    theme?: Partial<Record<keyof typeof THEMES, string>>;
  }
>;

type ChartContextValue = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextValue | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error("Chart components must be used within a ChartContainer.");
  }

  return context;
}

function getConfigColor(
  configItem: ChartConfig[string] | undefined,
  theme: keyof typeof THEMES,
): string | undefined {
  return configItem?.theme?.[theme] ?? configItem?.color;
}

function getPayloadValue(
  payload: Record<string, unknown> | undefined,
  key?: string,
) {
  if (!payload || !key) {
    return undefined;
  }

  return payload[key];
}

function getPayloadKey(
  payload: Record<string, unknown> | undefined,
  key?: string,
): string | undefined {
  const value = getPayloadValue(payload, key);
  return typeof value === "string" ? value : undefined;
}

function toChartNode(value: unknown): React.ReactNode {
  if (
    React.isValidElement(value) ||
    typeof value === "string" ||
    typeof value === "number"
  ) {
    return value;
  }

  return null;
}

function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: Record<string, unknown>,
  key?: string,
) {
  const payloadRoot =
    typeof payload.payload === "object" && payload.payload !== null
      ? (payload.payload as Record<string, unknown>)
      : undefined;

  const keys = [
    key,
    getPayloadKey(payloadRoot, key),
    getPayloadKey(payload, key),
    typeof payload.name === "string" ? payload.name : undefined,
    typeof payload.dataKey === "string" ? payload.dataKey : undefined,
    typeof payload.value === "string" ? payload.value : undefined,
  ].filter((value): value is string => Boolean(value));

  for (const candidate of keys) {
    if (config[candidate]) {
      return {
        key: candidate,
        config: config[candidate],
      };
    }
  }

  return null;
}

function buildIndicator(indicator: "dot" | "line" | "dashed", color: string) {
  if (indicator === "line") {
    return (
      <span
        className="h-3 w-0.5 rounded-full"
        style={{ backgroundColor: color }}
      />
    );
  }

  if (indicator === "dashed") {
    return (
      <span
        className="h-0.5 w-3"
        style={{
          backgroundImage: `linear-gradient(to right, ${color} 70%, transparent 70%)`,
          backgroundSize: "6px 100%",
        }}
      />
    );
  }

  return (
    <span
      className="h-2.5 w-2.5 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}

export const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig;
    children: React.ReactNode;
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId();
  const chartId = `chart-${id ?? uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        ref={ref}
        data-chart={chartId}
        className={cn(
          "h-[240px] w-full min-w-0 text-xs [&_.recharts-cartesian-axis-tick_text]:fill-gray-500 [&_.recharts-cartesian-grid_line]:stroke-gray-200 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-gray-300 [&_.recharts-layer]:outline-none [&_.recharts-surface]:outline-none",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer width="100%" height="100%" minWidth={0}>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});
ChartContainer.displayName = "ChartContainer";

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const colorEntries = Object.entries(config).filter(
    ([, value]) => value.color || value.theme,
  );

  if (!colorEntries.length) {
    return null;
  }

  const styles = (Object.keys(THEMES) as Array<keyof typeof THEMES>)
    .map((theme) => {
      const declarations = colorEntries
        .map(([key, value]) => {
          const color = getConfigColor(value, theme);
          return color ? `--color-${key}: ${color};` : null;
        })
        .filter((value): value is string => Boolean(value));

      if (!declarations.length) {
        return null;
      }

      return `${THEMES[theme]} [data-chart="${id}"] { ${declarations.join(" ")} }`;
    })
    .filter((value): value is string => Boolean(value))
    .join("\n");

  return <style dangerouslySetInnerHTML={{ __html: styles }} />;
}

export const ChartTooltip = RechartsPrimitive.Tooltip;

type ChartTooltipContentProps = React.ComponentProps<"div"> & {
  active?: boolean;
  payload?: Array<Record<string, unknown>>;
  label?: React.ReactNode;
  hideLabel?: boolean;
  hideIndicator?: boolean;
  labelKey?: string;
  nameKey?: string;
  indicator?: "dot" | "line" | "dashed";
};

export function ChartTooltipContent({
  active,
  payload,
  label,
  hideLabel = false,
  hideIndicator = false,
  labelKey,
  nameKey,
  indicator = "dot",
  className,
}: ChartTooltipContentProps) {
  const { config } = useChart();

  if (!active || !payload?.length) {
    return null;
  }

  const firstItem = payload[0];
  const payloadRoot =
    typeof firstItem.payload === "object" && firstItem.payload !== null
      ? (firstItem.payload as Record<string, unknown>)
      : undefined;
  const resolvedLabel = labelKey
    ? (getPayloadValue(payloadRoot, labelKey) ?? label)
    : label;
  const resolvedLabelConfig =
    typeof resolvedLabel === "string"
      ? getPayloadConfigFromPayload(config, firstItem, resolvedLabel)
      : null;
  const tooltipLabel = toChartNode(
    resolvedLabelConfig?.config.label ?? resolvedLabel,
  );

  return (
    <div
      className={cn(
        "grid min-w-[12rem] gap-2 rounded-xl border border-border bg-background/95 px-3 py-2 text-sm shadow-lg backdrop-blur",
        className,
      )}
    >
      {!hideLabel && tooltipLabel ? (
        <p className="font-medium text-primary">{tooltipLabel}</p>
      ) : null}
      <div className="grid gap-1.5">
        {payload.map((item) => {
          const resolved =
            getPayloadConfigFromPayload(config, item, nameKey) ??
            getPayloadConfigFromPayload(
              config,
              item,
              typeof item.dataKey === "string" ? item.dataKey : undefined,
            );
          const itemLabel =
            toChartNode(
              resolved?.config.label ??
                (typeof getPayloadValue(
                  typeof item.payload === "object" && item.payload !== null
                    ? (item.payload as Record<string, unknown>)
                    : undefined,
                  nameKey,
                ) === "string"
                  ? (getPayloadValue(
                      typeof item.payload === "object" && item.payload !== null
                        ? (item.payload as Record<string, unknown>)
                        : undefined,
                      nameKey,
                    ) as string)
                  : item.name),
            ) ?? "Series";
          const color =
            (typeof item.color === "string" && item.color) ||
            (typeof getPayloadValue(
              typeof item.payload === "object" && item.payload !== null
                ? (item.payload as Record<string, unknown>)
                : undefined,
              "fill",
            ) === "string"
              ? (getPayloadValue(
                  typeof item.payload === "object" && item.payload !== null
                    ? (item.payload as Record<string, unknown>)
                    : undefined,
                  "fill",
                ) as string)
              : undefined) ||
            (resolved?.key ? `var(--color-${resolved.key})` : "var(--chart-1)");

          const Icon = resolved?.config.icon;
          const formattedValue =
            typeof item.value === "number"
              ? item.value.toLocaleString()
              : String(item.value ?? "");

          return (
            <div
              key={`${item.dataKey ?? item.name ?? "item"}-${formattedValue}`}
              className="flex items-center justify-between gap-3"
            >
              <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
                {Icon ? (
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                ) : hideIndicator ? null : (
                  buildIndicator(indicator, color)
                )}
                <span className="truncate">{itemLabel}</span>
              </div>
              <span className="font-semibold text-primary">
                {formattedValue}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const ChartLegend = RechartsPrimitive.Legend;

type ChartLegendContentProps = React.ComponentProps<"div"> & {
  payload?: Array<Record<string, unknown>>;
  nameKey?: string;
  hideIcon?: boolean;
};

export function ChartLegendContent({
  payload,
  nameKey,
  hideIcon = false,
  className,
}: ChartLegendContentProps) {
  const { config } = useChart();

  if (!payload?.length) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-4 pt-2 text-sm text-muted-foreground",
        className,
      )}
    >
      {payload.map((item) => {
        const resolved =
          getPayloadConfigFromPayload(config, item, nameKey) ??
          getPayloadConfigFromPayload(
            config,
            item,
            typeof item.dataKey === "string" ? item.dataKey : undefined,
          );
        const Icon = resolved?.config.icon;
        const color =
          (typeof item.color === "string" && item.color) ||
          (resolved?.key ? `var(--color-${resolved.key})` : "var(--chart-1)");
        const label =
          toChartNode(resolved?.config.label ?? item.value) ?? "Series";

        return (
          <div
            key={`${item.value ?? item.dataKey ?? "legend"}-item`}
            className="flex items-center gap-2"
          >
            {hideIcon ? null : Icon ? (
              <Icon className="h-3.5 w-3.5" />
            ) : (
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
            )}
            <span>{label as React.ReactNode}</span>
          </div>
        );
      })}
    </div>
  );
}
