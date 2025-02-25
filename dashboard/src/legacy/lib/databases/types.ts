import { cloudProviderValidator } from "legacy/lib/clusters/types";
import { z } from "zod";

export const datastoreEnvValidator = z.object({
  name: z.string(),
  linked_applications: z.string().array().default([]),
  secret_variables: z.record(z.string()).default({}),
  variables: z.record(z.string()).default({}),
});

export type DatastoreEnvWithSource = z.infer<typeof datastoreEnvValidator>;

export const datastoreMetadataValidator = z.object({
  name: z.string(),
  value: z.string().default(""),
});

export type DatastoreMetadataWithSource = z.infer<
  typeof datastoreMetadataValidator
>;
export const datastoreCredentialValidator = z.object({
  host: z.string().optional().default(""),
  port: z.number().optional().default(0),
  username: z.string().optional().default(""),
  database_name: z.string().optional().default(""),
  password: z.string().optional().default(""),
});
export type DatastoreConnectionInfo = z.infer<
  typeof datastoreCredentialValidator
>;

const datastoreTypeValidator = z.enum([
  "UNKNOWN",
  "RDS",
  "ELASTICACHE",
  "MANAGED_REDIS",
  "MANAGED_POSTGRES",
  "NEON",
  "UPSTASH",
]);
const datastoreEngineValidator = z.enum([
  "UNKNOWN",
  "POSTGRES",
  "AURORA-POSTGRES",
  "REDIS",
  "MEMCACHED",
]);
export const datastoreValidator = z.object({
  name: z.string(),
  type: z.string().pipe(datastoreTypeValidator.catch("UNKNOWN")),
  engine: z.string().pipe(datastoreEngineValidator.catch("UNKNOWN")),
  created_at: z.string().default(""),
  metadata: datastoreMetadataValidator.array().default([]),
  env: datastoreEnvValidator.optional(),
  connection_string: z.string().default(""),
  status: z.enum([
    "",
    "CREATING",
    "CONFIGURING_LOG_EXPORTS",
    "MODIFYING",
    "CONFIGURING_ENHANCED_MONITORING",
    "BACKING_UP",
    "AVAILABLE",
    "AWAITING_DELETION",
    "DELETING_REPLICATION_GROUP",
    "DELETING_PARAMETER_GROUP",
    "DELETING_RECORD",
    "DELETED",
  ]),
  cloud_provider: z.string().pipe(cloudProviderValidator.catch("UNKNOWN")),
  cloud_provider_credential_identifier: z.string(),
  credential: datastoreCredentialValidator,
  connected_cluster_ids: z.number().array().optional().default([]),
  on_management_cluster: z.boolean().default(false),
});

export type SerializedDatastore = z.infer<typeof datastoreValidator>;

export type ClientDatastore = SerializedDatastore & {
  template: DatastoreTemplate;
};

export const datastoreListResponseValidator = z.object({
  datastores: datastoreValidator.array(),
});

export type DatastoreEngine = {
  name: z.infer<typeof datastoreValidator>["engine"];
  displayName: string;
  icon: string;
};

export type DatastoreType = {
  name: z.infer<typeof datastoreValidator>["type"];
  displayName: string;
};
export const DATASTORE_TYPE_RDS: DatastoreType = {
  name: "RDS" as const,
  displayName: "RDS",
};
export const DATASTORE_TYPE_ELASTICACHE: DatastoreType = {
  name: "ELASTICACHE" as const,
  displayName: "ElastiCache",
};
export const DATASTORE_TYPE_MANAGED_POSTGRES: DatastoreType = {
  name: "MANAGED_POSTGRES" as const,
  displayName: "Managed Postgres",
};
export const DATASTORE_TYPE_MANAGED_REDIS: DatastoreType = {
  name: "MANAGED_REDIS" as const,
  displayName: "Managed Redis",
};
export const DATASTORE_TYPE_NEON: DatastoreType = {
  name: "NEON" as const,
  displayName: "Neon",
};
export const DATASTORE_TYPE_UPSTASH: DatastoreType = {
  name: "UPSTASH" as const,
  displayName: "Upstash",
};

export type DatastoreState = {
  state: z.infer<typeof datastoreValidator>["status"];
  displayName: string;
};
export const DATASTORE_STATE_CREATING: DatastoreState = {
  state: "CREATING",
  displayName: "Creating",
};
export const DATASTORE_STATE_CONFIGURING_LOG_EXPORTS: DatastoreState = {
  state: "CONFIGURING_LOG_EXPORTS",
  displayName: "Configuring log exports",
};
export const DATASTORE_STATE_MODIFYING: DatastoreState = {
  state: "MODIFYING",
  displayName: "Modifying",
};
export const DATASTORE_STATE_CONFIGURING_ENHANCED_MONITORING: DatastoreState = {
  state: "CONFIGURING_ENHANCED_MONITORING",
  displayName: "Configuring enhanced monitoring",
};
export const DATASTORE_STATE_BACKING_UP: DatastoreState = {
  state: "BACKING_UP",
  displayName: "Backing up",
};
export const DATASTORE_STATE_AVAILABLE: DatastoreState = {
  state: "AVAILABLE",
  displayName: "Finishing provision",
};
export const DATASTORE_STATE_AWAITING_DELETION: DatastoreState = {
  state: "AWAITING_DELETION",
  displayName: "Awaiting deletion",
};
export const DATASTORE_STATE_DELETING_REPLICATION_GROUP: DatastoreState = {
  state: "DELETING_REPLICATION_GROUP",
  displayName: "Deleting replication group",
};
export const DATASTORE_STATE_DELETING_PARAMETER_GROUP: DatastoreState = {
  state: "DELETING_PARAMETER_GROUP",
  displayName: "Deleting parameter group",
};
export const DATASTORE_STATE_DELETING_RECORD: DatastoreState = {
  state: "DELETING_RECORD",
  displayName: "Deleting all resources",
};
export const DATASTORE_STATE_DELETED: DatastoreState = {
  state: "DELETED",
  displayName: "Wrapping up",
};

export type DatastoreTab = {
  name: string;
  displayName: string;
  component: React.FC;
  isOnlyForPorterOperators?: boolean;
};

export const DEFAULT_DATASTORE_TAB = {
  name: "configuration",
  displayName: "Configuration",
  component: () => null,
};

export type DatastoreTemplate = {
  highLevelType: DatastoreEngine; // this was created so that rds aurora postgres and rds postgres can be grouped together
  type: DatastoreType;
  engine: DatastoreEngine;
  icon: string;
  name: string;
  displayName: string;
  description: string;
  disabled: boolean;
  instanceTiers: ResourceOption[];
  supportedEngineVersions: EngineVersion[];
  creationStateProgression: DatastoreState[];
  deletionStateProgression: DatastoreState[];
  tabs: DatastoreTab[]; // this what is rendered on the dashboard after the datastore is deployed
};

const instanceTierValidator = z.enum([
  "unspecified",
  "db.t4g.micro",
  "db.t4g.small",
  "db.t4g.medium",
  "db.t4g.large",
  "db.m6g.large",
  "db.r6g.4xlarge",
  "cache.t4g.micro",
  "cache.t4g.small",
  "cache.t4g.medium",
  "cache.r6g.large",
  "cache.r6g.xlarge",
]);
export type InstanceTier = z.infer<typeof instanceTierValidator>;

const engineVersionValidator = z.enum(["15.4", "14.11"]);
export type EngineVersion = {
  name: z.infer<typeof engineVersionValidator>;
  displayName: string;
};

const rdsPostgresConfigValidator = z.object({
  type: z.literal("rds-postgres"),
  instanceClass: instanceTierValidator
    .default("unspecified")
    .refine((val) => val !== "unspecified", {
      message: "Instance tier is required",
    }),
  allocatedStorageGigabytes: z
    .number()
    .int()
    .positive("Allocated storage must be a positive integer")
    .default(30),
  engineVersion: engineVersionValidator,
  // the following three are not yet specified by the user during creation - only parsed from the backend after the form is submitted
  databaseName: z
    .string()
    .nonempty("Database name is required")
    .default("postgres"),
  masterUsername: z
    .string()
    .nonempty("Master username is required")
    .default("postgres"),
  masterUserPassword: z
    .string()
    .nonempty("Master password is required")
    .default(""),
});

const managedPostgresConfigValidator = z.object({
  type: z.literal("managed-postgres"),
  instanceClass: instanceTierValidator
    .default("unspecified")
    .refine((val) => val !== "unspecified", {
      message: "Instance tier is required",
    }),
  allocatedStorageGigabytes: z
    .number()
    .int()
    .positive("Allocated storage must be a positive integer")
    .default(1),
  // the following three are not yet specified by the user during creation - only parsed from the backend after the form is submitted
  databaseName: z
    .string()
    .nonempty("Database name is required")
    .default("postgres"),
  masterUsername: z
    .string()
    .nonempty("Master username is required")
    .default("postgres"),
  masterUserPassword: z
    .string()
    .nonempty("Master password is required")
    .default(""),
});

const auroraPostgresConfigValidator = z.object({
  type: z.literal("rds-postgresql-aurora"),
  instanceClass: instanceTierValidator
    .default("unspecified")
    .refine((val) => val !== "unspecified", {
      message: "Instance tier is required",
    }),
  allocatedStorageGigabytes: z
    .number()
    .int()
    .positive("Allocated storage must be a positive integer")
    .default(30),
  // the following three are not yet specified by the user during creation - only parsed from the backend after the form is submitted
  databaseName: z
    .string()
    .nonempty("Database name is required")
    .default("postgres"),
  masterUsername: z
    .string()
    .nonempty("Master username is required")
    .default("postgres"),
  masterUserPassword: z
    .string()
    .nonempty("Master password is required")
    .default(""),
});

const elasticacheRedisConfigValidator = z.object({
  type: z.literal("elasticache-redis"),
  instanceClass: instanceTierValidator
    .default("unspecified")
    .refine((val) => val !== "unspecified", {
      message: "Instance tier is required",
    }),
  masterUserPassword: z
    .string()
    .nonempty("Master password is required")
    .default(""),
  engineVersion: z.string().default("7.1"),
});

const managedRedisConfigValidator = z.object({
  type: z.literal("managed-redis"),
  instanceClass: instanceTierValidator
    .default("unspecified")
    .refine((val) => val !== "unspecified", {
      message: "Instance tier is required",
    }),
  masterUserPassword: z
    .string()
    .nonempty("Master password is required")
    .default(""),
  engineVersion: z.string().default("7.1"),
  allocatedStorageGigabytes: z
    .number()
    .int()
    .positive("Allocated storage must be a positive integer")
    .default(1),
});

const neonValidator = z.object({
  type: z.literal("neon"),
});

const upstashValidator = z.object({
  type: z.literal("upstash"),
});

export const dbFormValidator = z.object({
  name: z
    .string()
    .nonempty("Name is required")
    .regex(/^[a-z0-9-]+$/, {
      message: "Lowercase letters, numbers, and “-” only.",
    }),
  workloadType: z
    .enum(["Production", "Test", "unspecified"])
    .default("unspecified"),
  engine: z
    .string()
    .pipe(datastoreEngineValidator.catch("UNKNOWN"))
    .default("UNKNOWN"),
  config: z.discriminatedUnion("type", [
    rdsPostgresConfigValidator,
    auroraPostgresConfigValidator,
    elasticacheRedisConfigValidator,
    managedRedisConfigValidator,
    managedPostgresConfigValidator,
    neonValidator,
    upstashValidator,
  ]),
  clusterId: z.number(),
});
export type DbFormData = z.infer<typeof dbFormValidator>;

export type ResourceOption = {
  tier: InstanceTier;
  label: string;
  cpuCores: number;
  ramGigabytes: number;
  storageGigabytes: number;
};
