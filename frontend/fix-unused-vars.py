#!/usr/bin/env python3
import re
import sys

# 读取文件列表和要删除的变量
fixes = {
    'components/dashboard/api-keys/api-key-dialog.tsx': [
        (r'const \{ data, error, isLoading, mutate, result \}', r'const { data, error, isLoading, mutate }'),
    ],
    'components/dashboard/api-keys/api-keys-form.tsx': [
        (r'const \{ t \} = useI18n\(\);', ''),
    ],
    'components/dashboard/api-keys/token-display-dialog.tsx': [
        (r'import \{ Copy, Check \} from "lucide-react";', ''),
        (r'const \[copied, setCopied\] = useState\(false\);', ''),
        (r'const handleCopy = .*?\n.*?\n.*?\n.*?\};', '', re.DOTALL),
    ],
    'components/dashboard/common.tsx': [
        (r'import \{ Button \} from "@/components/ui/button";', ''),
        (r'import \{ Activity, Server, Database \} from "lucide-react";', ''),
    ],
    'components/dashboard/notifications/notification-item.tsx': [
        (r'const \{ t \} = useI18n\(\);', ''),
    ],
    'components/dashboard/provider-keys/provider-key-dialog.tsx': [
        (r'providerId,', ''),
    ],
    'components/dashboard/provider-keys/provider-keys-table.tsx': [
        (r'onToggleStatus,', ''),
    ],
    'components/dashboard/providers/array-editor.tsx': [
        (r'placeholder,', ''),
    ],
    'components/dashboard/providers/providers-table-virtualized.tsx': [
        (r'import \{ formatRelativeTime \} from "@/lib/date-utils";', ''),
        (r'const \{ language \} = useI18n\(\);', ''),
        (r'const renderProbeResult = .*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\};', '', re.DOTALL),
    ],
}

for filepath, patterns in fixes.items():
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        for pattern in patterns:
            if len(pattern) == 2:
                old, new = pattern
                flags = 0
            else:
                old, new, flags = pattern
            content = re.sub(old, new, content, flags=flags)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"Fixed: {filepath}")
    except Exception as e:
        print(f"Error fixing {filepath}: {e}", file=sys.stderr)

print("Done!")
