// Terraform Plan JSON output types
// Reference: https://developer.hashicorp.com/terraform/internals/json-format

export type ActionType = 'no-op' | 'create' | 'read' | 'update' | 'delete';

export interface ResourceChange {
  address: string;
  module_address?: string;
  mode: 'managed' | 'data';
  type: string;
  name: string;
  provider_name: string;
  change: {
    actions: ActionType[];
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
    after_unknown: Record<string, boolean> | null;
    before_sensitive?: Record<string, boolean> | boolean;
    after_sensitive?: Record<string, boolean> | boolean;
  };
}

export interface ConfigurationResource {
  address: string;
  mode: 'managed' | 'data';
  type: string;
  name: string;
  provider_config_key: string;
  expressions?: Record<string, unknown>;
  depends_on?: string[];
}

export interface ModuleConfiguration {
  resources?: ConfigurationResource[];
  module_calls?: Record<string, {
    source: string;
    module: ModuleConfiguration;
  }>;
}

export interface TerraformPlan {
  format_version: string;
  terraform_version: string;
  planned_values?: {
    root_module?: {
      resources?: Array<{
        address: string;
        mode: 'managed' | 'data';
        type: string;
        name: string;
        provider_name: string;
        values: Record<string, unknown>;
      }>;
      child_modules?: Array<{
        address: string;
        resources: Array<{
          address: string;
          mode: 'managed' | 'data';
          type: string;
          name: string;
          provider_name: string;
          values: Record<string, unknown>;
        }>;
      }>;
    };
  };
  resource_changes?: ResourceChange[];
  configuration?: {
    provider_config?: Record<string, {
      name: string;
      full_name: string;
      expressions?: Record<string, unknown>;
    }>;
    root_module?: ModuleConfiguration;
  };
  prior_state?: {
    format_version: string;
    terraform_version: string;
    values?: {
      root_module?: {
        resources?: Array<{
          address: string;
          mode: 'managed' | 'data';
          type: string;
          name: string;
          provider_name: string;
          values: Record<string, unknown>;
        }>;
      };
    };
  };
}

// UI用の変換後の型
export interface ResourceNode {
  id: string;
  address: string;
  type: string;
  name: string;
  provider: string;
  action: ActionType;
  module?: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  dependencies: string[];
}

export interface ParsedPlan {
  terraformVersion: string;
  resources: ResourceNode[];
  summary: {
    create: number;
    update: number;
    delete: number;
    noOp: number;
    read: number;
  };
}
