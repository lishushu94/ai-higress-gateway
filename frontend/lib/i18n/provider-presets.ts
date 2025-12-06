import type { Language } from "../i18n-context";

export const providerPresetsTranslations: Record<Language, Record<string, string>> = {
  en: {
    // Provider preset table actions (admin dashboard)
    "provider_presets.table_preset_id": "Preset ID",
    "provider_presets.table_display_name": "Display Name",
    "provider_presets.table_base_url": "Base URL",
    "provider_presets.table_provider_type": "Provider Type",
    "provider_presets.table_transport": "Transport",
    "provider_presets.table_created_at": "Created At",
    "provider_presets.table_actions": "Actions",
    "provider_presets.action_edit": "Edit preset",
    "provider_presets.action_delete": "Delete preset",
  },
  zh: {
    // 提供商预设表格与操作
    "provider_presets.table_preset_id": "预设ID",
    "provider_presets.table_display_name": "显示名称",
    "provider_presets.table_base_url": "基础URL",
    "provider_presets.table_provider_type": "提供商类型",
    "provider_presets.table_transport": "传输方式",
    "provider_presets.table_created_at": "创建时间",
    "provider_presets.table_actions": "操作",
    "provider_presets.action_edit": "编辑预设",
    "provider_presets.action_delete": "删除预设",
  },
};

