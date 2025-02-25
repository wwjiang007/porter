import { DomainType } from "@porter-dev/api-contracts";
import {
  Addon,
  AddonType,
  Datadog,
  Metabase,
  Mezmo,
  Newrelic,
  Postgres,
  Quivr,
  Redis,
  Tailscale,
} from "@porter-dev/api-contracts/src/porter/v1/addons_pb";
import { serviceStringValidator } from "legacy/lib/porter-apps/values";
import { match } from "ts-pattern";
import { z } from "zod";

import { datadogConfigValidator } from "./datadog";
import { metabaseConfigValidator } from "./metabase";
import { mezmoConfigValidator } from "./mezmo";
import { newrelicConfigValidator } from "./newrelic";
import { defaultPostgresAddon, postgresConfigValidator } from "./postgres";
import { quivrConfigValidator } from "./quivr";
import { redisConfigValidator } from "./redis";
import { tailscaleConfigValidator } from "./tailscale";
import {
  ADDON_TEMPLATE_DATADOG,
  ADDON_TEMPLATE_METABASE,
  ADDON_TEMPLATE_MEZMO,
  ADDON_TEMPLATE_NEWRELIC,
  ADDON_TEMPLATE_POSTGRES,
  ADDON_TEMPLATE_QUIVR,
  ADDON_TEMPLATE_REDIS,
  ADDON_TEMPLATE_TAILSCALE,
  type AddonTemplate,
} from "./template";

export const clientAddonValidator = z.object({
  expanded: z.boolean().default(false),
  canDelete: z.boolean().default(true),
  name: z.object({
    readOnly: z.boolean().default(false),
    value: z
      .string()
      .min(1, { message: "Name must be at least 1 character" })
      .max(31, { message: "Name must be 31 characters or less" })
      .regex(/^[a-z0-9-]{1,61}$/, {
        message: 'Lowercase letters, numbers, and "-" only.',
      }),
  }),
  envGroups: z.array(serviceStringValidator).default([]),
  config: z.discriminatedUnion("type", [
    postgresConfigValidator,
    redisConfigValidator,
    datadogConfigValidator,
    mezmoConfigValidator,
    metabaseConfigValidator,
    newrelicConfigValidator,
    tailscaleConfigValidator,
    quivrConfigValidator,
  ]),
});
export type ClientAddonType = z.infer<
  typeof clientAddonValidator
>["config"]["type"];
export type ClientAddon = z.infer<typeof clientAddonValidator> & {
  template: AddonTemplate<ClientAddonType>;
};
export const legacyAddonValidator = z.object({
  name: z.string(),
  namespace: z.string(),
  info: z.object({
    last_deployed: z.string(),
  }),
  chart: z.object({
    metadata: z
      .object({
        name: z.string().optional(),
        icon: z.string().optional(),
      })
      .optional(),
  }),
});
export type LegacyClientAddon = z.infer<typeof legacyAddonValidator>;

export function defaultClientAddon(
  type: ClientAddon["config"]["type"]
): ClientAddon {
  return match(type)
    .returnType<ClientAddon>()
    .with("postgres", () => ({
      ...clientAddonValidator.parse({
        expanded: true,
        name: { readOnly: false, value: "postgres" },
        config: defaultPostgresAddon(),
      }),
      template: ADDON_TEMPLATE_POSTGRES,
    }))
    .with("redis", () => ({
      ...clientAddonValidator.parse({
        expanded: true,
        name: { readOnly: false, value: "redis" },
        config: redisConfigValidator.parse({
          type: "redis",
        }),
      }),
      template: ADDON_TEMPLATE_REDIS,
    }))
    .with("datadog", () => ({
      ...clientAddonValidator.parse({
        expanded: true,
        name: { readOnly: false, value: "datadog" },
        config: datadogConfigValidator.parse({
          type: "datadog",
        }),
      }),
      template: ADDON_TEMPLATE_DATADOG,
    }))
    .with("mezmo", () => ({
      ...clientAddonValidator.parse({
        expanded: true,
        name: { readOnly: false, value: "mezmo" },
        config: mezmoConfigValidator.parse({
          type: "mezmo",
        }),
      }),
      template: ADDON_TEMPLATE_MEZMO,
    }))
    .with("metabase", () => ({
      ...clientAddonValidator.parse({
        expanded: true,
        name: { readOnly: false, value: "metabase" },
        config: metabaseConfigValidator.parse({
          type: "metabase",
        }),
      }),
      template: ADDON_TEMPLATE_METABASE,
    }))
    .with("newrelic", () => ({
      ...clientAddonValidator.parse({
        expanded: true,
        name: { readOnly: false, value: "newrelic" },
        config: newrelicConfigValidator.parse({
          type: "newrelic",
        }),
      }),
      template: ADDON_TEMPLATE_NEWRELIC,
    }))
    .with("tailscale", () => ({
      ...clientAddonValidator.parse({
        expanded: true,
        name: { readOnly: false, value: "tailscale" },
        config: tailscaleConfigValidator.parse({
          type: "tailscale",
        }),
      }),
      template: ADDON_TEMPLATE_TAILSCALE,
    }))
    .with("quivr", () => ({
      ...clientAddonValidator.parse({
        expanded: true,
        name: { readOnly: false, value: "quivr" },
        config: quivrConfigValidator.parse({
          type: "quivr",
        }),
      }),
      template: ADDON_TEMPLATE_QUIVR,
    }))
    .exhaustive();
}

function addonTypeEnumProto(type: ClientAddon["config"]["type"]): AddonType {
  return match(type)
    .with("postgres", () => AddonType.POSTGRES)
    .with("redis", () => AddonType.REDIS)
    .with("datadog", () => AddonType.DATADOG)
    .with("mezmo", () => AddonType.MEZMO)
    .with("metabase", () => AddonType.METABASE)
    .with("newrelic", () => AddonType.NEWRELIC)
    .with("tailscale", () => AddonType.TAILSCALE)
    .with("quivr", () => AddonType.QUIVR)
    .exhaustive();
}

export function clientAddonToProto(
  addon: Omit<ClientAddon, "template">
): Addon {
  const config = match(addon.config)
    .returnType<Addon["config"]>()
    .with({ type: "postgres" }, (data) => ({
      value: new Postgres({
        cpuCores: data.cpuCores.value,
        ramMegabytes: data.ramMegabytes.value,
        storageGigabytes: data.storageGigabytes.value,
      }),
      case: "postgres" as const,
    }))
    .with({ type: "redis" }, (data) => ({
      value: new Redis({
        cpuCores: data.cpuCores.value,
        ramMegabytes: data.ramMegabytes.value,
        storageGigabytes: data.storageGigabytes.value,
      }),
      case: "redis" as const,
    }))
    .with({ type: "datadog" }, (data) => ({
      value: new Datadog({
        cpuCores: data.cpuCores,
        ramMegabytes: data.ramMegabytes,
        site: data.site,
        apiKey: data.apiKey,
        loggingEnabled: data.loggingEnabled,
        apmEnabled: data.apmEnabled,
        dogstatsdEnabled: data.dogstatsdEnabled,
      }),
      case: "datadog" as const,
    }))
    .with({ type: "mezmo" }, (data) => ({
      value: new Mezmo({
        ingestionKey: data.ingestionKey,
      }),
      case: "mezmo" as const,
    }))
    .with({ type: "metabase" }, (data) => ({
      value: new Metabase({
        ingressEnabled: data.exposedToExternalTraffic,
        domains: [
          {
            name: data.customDomain,
            type: DomainType.UNSPECIFIED,
          },
          {
            name: data.porterDomain,
            type: DomainType.PORTER,
          },
          // if not exposed, remove all domains
        ].filter((d) => d.name !== "" && data.exposedToExternalTraffic),
        datastore: {
          host: data.datastore.host,
          port: BigInt(data.datastore.port),
          databaseName: data.datastore.databaseName,
          masterUsername: data.datastore.username,
          masterUserPasswordLiteral: data.datastore.password,
        },
      }),
      case: "metabase" as const,
    }))
    .with({ type: "newrelic" }, (data) => ({
      value: new Newrelic({
        licenseKey: data.licenseKey,
        insightsKey: data.insightsKey,
        personalApiKey: data.personalApiKey,
        accountId: data.accountId,
        loggingEnabled: data.loggingEnabled,
        kubeEventsEnabled: data.kubeEventsEnabled,
        metricsAdapterEnabled: data.metricsAdapterEnabled,
        prometheusEnabled: data.prometheusEnabled,
        pixieEnabled: data.pixieEnabled,
      }),
      case: "newrelic" as const,
    }))
    .with({ type: "tailscale" }, (data) => ({
      value: new Tailscale({
        authKey: data.authKey,
        subnetRoutes: data.subnetRoutes
          .map((r) => r.route)
          .filter((r) => r !== ""),
      }),
      case: "tailscale" as const,
    }))
    .with({ type: "quivr" }, (data) => ({
      value: new Quivr({
        ingressEnabled: data.exposedToExternalTraffic,
        domains: [
          {
            name: data.customDomain,
            type: DomainType.UNSPECIFIED,
          },
          {
            name: data.porterDomain,
            type: DomainType.PORTER,
          },
          // if not exposed, remove all domains
        ].filter((d) => d.name !== "" && data.exposedToExternalTraffic),
        openaiApiKey: data.openAiApiKey,
        supabaseUrl: data.supabaseUrl,
        supabaseServiceKey: data.supabaseServiceKey,
        pgDatabaseUrl: data.pgDatabaseUrl,
        jwtSecretKey: data.jwtSecretKey,
        quivrDomain: data.quivrDomain,
        anthropicApiKey: data.anthropicApiKey,
        cohereApiKey: data.cohereApiKey,
      }),
      case: "quivr" as const,
    }))
    .exhaustive();

  const proto = new Addon({
    name: addon.name.value,
    type: addonTypeEnumProto(addon.config.type),
    envGroups: addon.envGroups.map((envGroup) => ({
      name: envGroup.value,
    })),
    config,
  });

  return proto;
}

export function clientAddonFromProto({
  addon,
  variables = {},
  secrets = {},
}: {
  addon: Addon;
  variables?: Record<string, string>;
  secrets?: Record<string, string>;
}): ClientAddon {
  if (!addon.config.case) {
    throw new Error("Addon type is unspecified");
  }

  const config = match(addon.config)
    .returnType<ClientAddon["config"]>()
    .with({ case: "postgres" }, (data) => ({
      type: "postgres" as const,
      cpuCores: {
        readOnly: false,
        value: data.value.cpuCores,
      },
      ramMegabytes: {
        readOnly: false,
        value: data.value.ramMegabytes,
      },
      storageGigabytes: {
        readOnly: false,
        value: data.value.storageGigabytes,
      },
      username: variables.POSTGRESQL_USERNAME,
      password: secrets.POSTGRESQL_PASSWORD,
    }))
    .with({ case: "redis" }, (data) => ({
      type: "redis" as const,
      cpuCores: {
        readOnly: false,
        value: data.value.cpuCores,
      },
      ramMegabytes: {
        readOnly: false,
        value: data.value.ramMegabytes,
      },
      storageGigabytes: {
        readOnly: false,
        value: data.value.storageGigabytes,
      },
      password: secrets.REDIS_PASSWORD,
    }))
    .with({ case: "datadog" }, (data) => ({
      type: "datadog" as const,
      cpuCores: data.value.cpuCores ?? 0,
      ramMegabytes: data.value.ramMegabytes ?? 0,
      site: data.value.site ?? "",
      apiKey: data.value.apiKey ?? "",
      loggingEnabled: data.value.loggingEnabled ?? false,
      apmEnabled: data.value.apmEnabled ?? false,
      dogstatsdEnabled: data.value.dogstatsdEnabled ?? false,
    }))
    .with({ case: "mezmo" }, (data) => ({
      type: "mezmo" as const,
      ingestionKey: data.value.ingestionKey ?? "",
    }))
    .with({ case: "metabase" }, (data) => ({
      type: "metabase" as const,
      exposedToExternalTraffic: data.value.ingressEnabled ?? false,
      porterDomain:
        data.value.domains.find((domain) => domain.type === DomainType.PORTER)
          ?.name ?? "",
      customDomain:
        data.value.domains.find(
          (domain) => domain.type === DomainType.UNSPECIFIED
        )?.name ?? "",
      datastore: {
        host: data.value.datastore?.host ?? "",
        port: Number(data.value.datastore?.port) ?? 0,
        databaseName: data.value.datastore?.databaseName ?? "",
        username: data.value.datastore?.masterUsername ?? "",
        password: data.value.datastore?.masterUserPasswordLiteral ?? "",
      },
    }))
    .with({ case: "newrelic" }, (data) => ({
      type: "newrelic" as const,
      licenseKey: data.value.licenseKey ?? "",
      insightsKey: data.value.insightsKey ?? "",
      personalApiKey: data.value.personalApiKey ?? "",
      accountId: data.value.accountId ?? "",
      loggingEnabled: data.value.loggingEnabled ?? false,
      kubeEventsEnabled: data.value.kubeEventsEnabled ?? false,
      metricsAdapterEnabled: data.value.metricsAdapterEnabled ?? false,
      prometheusEnabled: data.value.prometheusEnabled ?? false,
      pixieEnabled: data.value.pixieEnabled ?? false,
    }))
    .with({ case: "tailscale" }, (data) => ({
      type: "tailscale" as const,
      authKey: data.value.authKey ?? "",
      subnetRoutes: data.value.subnetRoutes.map((r) => ({ route: r })),
    }))
    .with({ case: "quivr" }, (data) => ({
      type: "quivr" as const,
      exposedToExternalTraffic: data.value.ingressEnabled ?? false,
      porterDomain:
        data.value.domains.find((domain) => domain.type === DomainType.PORTER)
          ?.name ?? "",
      customDomain:
        data.value.domains.find(
          (domain) => domain.type === DomainType.UNSPECIFIED
        )?.name ?? "",
      openAiApiKey: data.value.openaiApiKey ?? "",
      supabaseUrl: data.value.supabaseUrl ?? "",
      supabaseServiceKey: data.value.supabaseServiceKey ?? "",
      pgDatabaseUrl: data.value.pgDatabaseUrl ?? "",
      jwtSecretKey: data.value.jwtSecretKey ?? "",
      quivrDomain: data.value.quivrDomain ?? "",
      anthropicApiKey: data.value.anthropicApiKey ?? "",
      cohereApiKey: data.value.cohereApiKey ?? "",
    }))
    .exhaustive();

  const template = match(addon.config)
    .with({ case: "postgres" }, () => ADDON_TEMPLATE_POSTGRES)
    .with({ case: "redis" }, () => ADDON_TEMPLATE_REDIS)
    .with({ case: "datadog" }, () => ADDON_TEMPLATE_DATADOG)
    .with({ case: "mezmo" }, () => ADDON_TEMPLATE_MEZMO)
    .with({ case: "metabase" }, () => ADDON_TEMPLATE_METABASE)
    .with({ case: "newrelic" }, () => ADDON_TEMPLATE_NEWRELIC)
    .with({ case: "tailscale" }, () => ADDON_TEMPLATE_TAILSCALE)
    .with({ case: "quivr" }, () => ADDON_TEMPLATE_QUIVR)
    .exhaustive();

  const clientAddon = {
    ...clientAddonValidator.parse({
      name: { readOnly: false, value: addon.name },
      envGroups: addon.envGroups.map((envGroup) => ({
        value: envGroup.name,
      })),
      config,
    }),
    template,
  };

  return clientAddon;
}

export const tailscaleServiceValidator = z.object({
  name: z.string(),
  ip: z.string(),
  port: z.number(),
});
export type ClientTailscaleService = z.infer<typeof tailscaleServiceValidator>;
