import type { Node, Edge } from '@xyflow/react';
import type {
  TerraformPlan,
  ResourceNode,
  ParsedPlan,
  ActionType,
  ConfigurationResource,
  ModuleConfiguration,
} from '../types/terraform';

// アクションの優先度（複数アクションがある場合の表示用）
function getPrimaryAction(actions: ActionType[]): ActionType {
  if (actions.includes('delete')) return 'delete';
  if (actions.includes('create')) return 'create';
  if (actions.includes('update')) return 'update';
  if (actions.includes('read')) return 'read';
  return 'no-op';
}

// 設定から依存関係を抽出
function extractDependencies(config: ModuleConfiguration | undefined): Map<string, string[]> {
  const deps = new Map<string, string[]>();

  function processResources(resources: ConfigurationResource[] | undefined, modulePrefix = '') {
    if (!resources) return;

    for (const resource of resources) {
      const address = modulePrefix
        ? `${modulePrefix}.${resource.address}`
        : resource.address;

      const resourceDeps: string[] = [];

      // depends_on から依存関係を取得
      if (resource.depends_on) {
        resourceDeps.push(...resource.depends_on);
      }

      // expressions から参照を抽出（簡易的な実装）
      if (resource.expressions) {
        const refs = extractReferencesFromExpressions(resource.expressions);
        resourceDeps.push(...refs);
      }

      deps.set(address, resourceDeps);
    }
  }

  function processModule(module: ModuleConfiguration | undefined, modulePrefix = '') {
    if (!module) return;

    processResources(module.resources, modulePrefix);

    if (module.module_calls) {
      for (const [name, call] of Object.entries(module.module_calls)) {
        const newPrefix = modulePrefix ? `${modulePrefix}.module.${name}` : `module.${name}`;
        processModule(call.module, newPrefix);
      }
    }
  }

  processModule(config);
  return deps;
}

// expressions から参照を抽出（簡易実装）
function extractReferencesFromExpressions(expressions: Record<string, unknown>): string[] {
  const refs: string[] = [];

  function traverse(obj: unknown) {
    if (typeof obj !== 'object' || obj === null) return;

    if (Array.isArray(obj)) {
      obj.forEach(traverse);
      return;
    }

    const record = obj as Record<string, unknown>;

    // references フィールドがあれば抽出
    if ('references' in record && Array.isArray(record.references)) {
      for (const ref of record.references) {
        if (typeof ref === 'string' && !ref.startsWith('var.') && !ref.startsWith('local.')) {
          refs.push(ref);
        }
      }
    }

    for (const value of Object.values(record)) {
      traverse(value);
    }
  }

  traverse(expressions);
  return refs;
}

export function parseTerraformPlan(plan: TerraformPlan): ParsedPlan {
  // デバッグ: JSONの構造を確認
  console.log('Parsing plan:', {
    terraform_version: plan.terraform_version,
    resource_changes_count: plan.resource_changes?.length ?? 0,
    resource_changes: plan.resource_changes?.slice(0, 3), // 最初の3つだけ
  });

  const resources: ResourceNode[] = [];
  const summary = {
    create: 0,
    update: 0,
    delete: 0,
    noOp: 0,
    read: 0,
  };

  // 依存関係マップを構築
  const dependencyMap = extractDependencies(plan.configuration?.root_module);

  // resource_changes を処理
  if (plan.resource_changes) {
    for (const change of plan.resource_changes) {
      const action = getPrimaryAction(change.change.actions);

      // サマリーを更新
      switch (action) {
        case 'create':
          summary.create++;
          break;
        case 'update':
          summary.update++;
          break;
        case 'delete':
          summary.delete++;
          break;
        case 'read':
          summary.read++;
          break;
        default:
          summary.noOp++;
      }

      const resourceAddress = change.mode === 'data'
        ? `data.${change.type}.${change.name}`
        : `${change.type}.${change.name}`;

      resources.push({
        id: change.address,
        address: change.address,
        type: change.type,
        name: change.name,
        provider: change.provider_name,
        action,
        module: change.module_address,
        before: change.change.before,
        after: change.change.after,
        dependencies: dependencyMap.get(resourceAddress) || [],
      });
    }
  }

  return {
    terraformVersion: plan.terraform_version,
    resources,
    summary,
  };
}

// プロバイダー名を短縮形に変換
function getShortProviderName(provider: string): string {
  // registry.terraform.io/hashicorp/aws -> aws
  const parts = provider.split('/');
  return parts[parts.length - 1];
}

// 文字列から一貫したハッシュ値を生成
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32bit整数に変換
  }
  return Math.abs(hash);
}

// プロバイダー名からテーマに合った色を生成
function getProviderColor(provider: string): { bg: string; border: string; text: string } {
  const hash = hashString(provider);

  // Hue: ハッシュから色相を決定 (0-360)
  const hue = hash % 360;

  // 彩度と明度は固定範囲で統一感を出す
  const saturation = 45; // 彩度: 控えめ
  const bgLightness = 96; // 背景: かなり明るい
  const borderLightness = 70; // ボーダー: やや明るい
  const textLightness = 35; // テキスト: 暗め

  return {
    bg: `hsl(${hue}, ${saturation}%, ${bgLightness}%)`,
    border: `hsl(${hue}, ${saturation}%, ${borderLightness}%)`,
    text: `hsl(${hue}, ${saturation + 10}%, ${textLightness}%)`,
  };
}

// リソースタイプからサービス名を抽出
// google_cloud_run_v2_job -> cloud_run_v2
// aws_s3_bucket -> s3
function extractServiceFromType(type: string, provider: string): { service: string; resourceName: string } {
  const shortProvider = getShortProviderName(provider);

  // プロバイダープレフィックスを除去
  let remaining = type;
  if (type.startsWith(`${shortProvider}_`)) {
    remaining = type.slice(shortProvider.length + 1);
  } else if (type.startsWith('google_')) {
    remaining = type.slice(7);
  } else if (type.startsWith('aws_')) {
    remaining = type.slice(4);
  } else if (type.startsWith('azurerm_')) {
    remaining = type.slice(8);
  }

  // サービス名とリソース名を分離
  // 共通パターン: service_resource または service_sub_resource
  const parts = remaining.split('_');

  if (parts.length === 1) {
    return { service: parts[0], resourceName: parts[0] };
  }

  // 特殊なケース: cloud_run_v2_job のような複合サービス名
  // v1, v2などのバージョンを含むケースを検出
  let serviceEndIndex = 1;
  for (let i = 1; i < parts.length - 1; i++) {
    if (/^v\d+$/.test(parts[i])) {
      serviceEndIndex = i + 1;
      break;
    }
  }

  // 2語以上のサービス名を検出 (compute_instance, cloud_run など)
  const knownMultiWordServices = [
    'cloud_run', 'cloud_sql', 'cloud_storage', 'cloud_functions',
    'compute_instance', 'container_cluster', 'bigquery',
    'api_gateway', 'app_engine', 'cloud_build',
    'iam_role', 'iam_policy', 'iam_user',
    's3_bucket', 'ec2_instance', 'rds_cluster',
    'lambda_function', 'dynamodb_table',
  ];

  for (const known of knownMultiWordServices) {
    if (remaining.startsWith(known)) {
      const rest = remaining.slice(known.length);
      if (rest === '' || rest.startsWith('_')) {
        return {
          service: known,
          resourceName: rest ? rest.slice(1) : known.split('_').pop()!,
        };
      }
    }
  }

  // デフォルト: 最初の部分をサービス名、残りをリソース名
  const service = parts.slice(0, serviceEndIndex).join('_');
  const resourceName = parts.slice(serviceEndIndex).join('_') || parts[parts.length - 1];

  return { service, resourceName };
}

interface ServiceGroup {
  resources: ResourceNode[];
}

interface ProviderGroup {
  services: Map<string, ServiceGroup>;
}

// React Flow用のノードとエッジに変換
export function toReactFlowElements(parsed: ParsedPlan): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // プロバイダー > サービス > リソース の階層構造を構築
  const hierarchy = new Map<string, ProviderGroup>();

  for (const resource of parsed.resources) {
    const providerKey = getShortProviderName(resource.provider);
    const { service } = extractServiceFromType(resource.type, resource.provider);

    if (!hierarchy.has(providerKey)) {
      hierarchy.set(providerKey, { services: new Map() });
    }
    const providerGroup = hierarchy.get(providerKey)!;

    if (!providerGroup.services.has(service)) {
      providerGroup.services.set(service, { resources: [] });
    }
    providerGroup.services.get(service)!.resources.push(resource);
  }

  // レイアウト定数
  const PADDING = 16;
  const NODE_WIDTH = 220;
  const NODE_HEIGHT = 85;
  const SERVICE_HEADER = 30;
  const PROVIDER_HEADER = 40;
  const RESOURCE_COLS = 2; // リソースの列数
  const ASPECT_RATIO = [2, 1] as const; // [横, 縦] の比率

  let providerYOffset = 0;

  for (const [providerName, providerGroup] of hierarchy) {
    const providerId = `provider-${providerName}`;

    // 各サービスのサイズを事前計算
    const serviceInfos: Array<{
      name: string;
      group: ServiceGroup;
      width: number;
      height: number;
    }> = [];

    for (const [serviceName, serviceGroup] of providerGroup.services) {
      const resourceCount = serviceGroup.resources.length;
      const rows = Math.ceil(resourceCount / RESOURCE_COLS);
      const width = RESOURCE_COLS * NODE_WIDTH + (RESOURCE_COLS + 1) * PADDING;
      const height = SERVICE_HEADER + rows * NODE_HEIGHT + (rows + 1) * PADDING;
      serviceInfos.push({ name: serviceName, group: serviceGroup, width, height });
    }

    // サービスグループをグリッド配置するための列数を計算
    // ASPECT_RATIO [横, 縦] の比率でレイアウト
    const serviceCount = serviceInfos.length;
    const [ratioX, ratioY] = ASPECT_RATIO;
    const serviceCols = Math.max(1, Math.ceil(Math.sqrt(serviceCount * ratioX / ratioY)));
    const serviceRows = Math.ceil(serviceCount / serviceCols);

    // 各行の最大高さ、各列の最大幅を計算
    const rowHeights: number[] = Array(serviceRows).fill(0);
    const colWidths: number[] = Array(serviceCols).fill(0);

    serviceInfos.forEach((info, index) => {
      const col = index % serviceCols;
      const row = Math.floor(index / serviceCols);
      colWidths[col] = Math.max(colWidths[col], info.width);
      rowHeights[row] = Math.max(rowHeights[row], info.height);
    });

    // 累積位置を計算
    const colPositions: number[] = [PADDING];
    for (let i = 0; i < serviceCols; i++) {
      colPositions.push(colPositions[i] + colWidths[i] + PADDING);
    }

    const rowPositions: number[] = [PROVIDER_HEADER + PADDING];
    for (let i = 0; i < serviceRows; i++) {
      rowPositions.push(rowPositions[i] + rowHeights[i] + PADDING);
    }

    const providerWidth = colPositions[serviceCols] + PADDING;
    const providerHeight = rowPositions[serviceRows] + PADDING;

    // プロバイダーの色を生成
    const providerColor = getProviderColor(providerName);

    // プロバイダーグループノード
    nodes.push({
      id: providerId,
      type: 'group',
      position: { x: 0, y: providerYOffset },
      data: { label: providerName },
      style: {
        width: providerWidth,
        height: providerHeight,
        backgroundColor: providerColor.bg,
        border: `2px solid ${providerColor.border}`,
        borderRadius: '16px',
      },
    });

    // プロバイダーラベル
    nodes.push({
      id: `${providerId}-label`,
      type: 'default',
      position: { x: PADDING, y: 8 },
      parentId: providerId,
      extent: 'parent',
      draggable: false,
      selectable: false,
      data: { label: `☁️ ${providerName.toUpperCase()}` },
      style: {
        background: 'transparent',
        border: 'none',
        fontSize: '14px',
        fontWeight: 700,
        color: providerColor.text,
        padding: 0,
        width: 'auto',
      },
    });

    // サービスグループを配置
    serviceInfos.forEach((info, index) => {
      const col = index % serviceCols;
      const row = Math.floor(index / serviceCols);
      const serviceId = `${providerId}-${info.name}`;

      const x = colPositions[col];
      const y = rowPositions[row];

      // サービスグループノード
      nodes.push({
        id: serviceId,
        type: 'group',
        position: { x, y },
        parentId: providerId,
        extent: 'parent',
        data: { label: info.name },
        style: {
          width: info.width,
          height: info.height,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          border: '1px solid #e5e7eb',
          borderRadius: '10px',
        },
      });

      // サービスラベル
      nodes.push({
        id: `${serviceId}-label`,
        type: 'default',
        position: { x: PADDING, y: 6 },
        parentId: serviceId,
        extent: 'parent',
        draggable: false,
        selectable: false,
        data: { label: info.name.replace(/_/g, ' ') },
        style: {
          background: 'transparent',
          border: 'none',
          fontSize: '11px',
          fontWeight: 600,
          color: '#6b7280',
          textTransform: 'uppercase',
          padding: 0,
          width: 'auto',
        },
      });

      // リソースノードを配置
      info.group.resources.forEach((resource, resourceIndex) => {
        const resourceCol = resourceIndex % RESOURCE_COLS;
        const resourceRow = Math.floor(resourceIndex / RESOURCE_COLS);
        const resourceX = PADDING + resourceCol * (NODE_WIDTH + PADDING);
        const resourceY = SERVICE_HEADER + PADDING + resourceRow * (NODE_HEIGHT + PADDING);

        nodes.push({
          id: resource.id,
          type: 'resourceNode',
          position: { x: resourceX, y: resourceY },
          parentId: serviceId,
          extent: 'parent',
          data: {
            label: `${resource.type}.${resource.name}`,
            resource,
            serviceName: info.name,
          },
        });
      });
    });

    providerYOffset += providerHeight + 30;
  }

  // エッジを作成（依存関係）
  const resourceIds = new Set(parsed.resources.map((r) => r.id));

  for (const resource of parsed.resources) {
    for (const dep of resource.dependencies) {
      const depId = parsed.resources.find(
        (r) => r.address.endsWith(dep) || r.id === dep
      )?.id;

      if (depId && resourceIds.has(depId)) {
        edges.push({
          id: `${depId}-${resource.id}`,
          source: depId,
          target: resource.id,
          animated: true,
          style: { stroke: '#64748b' },
        });
      }
    }
  }

  return { nodes, edges };
}
