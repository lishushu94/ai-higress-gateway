#!/bin/bash

# 修复 React 导入
sed -i 's/import React, { /import { /g' components/auth/auth-dialog.tsx
sed -i 's/import React, { /import { /g' components/dashboard/api-keys/api-keys-form.tsx
sed -i 's/import React, { /import { /g' components/dashboard/api-keys/token-display-dialog.tsx
sed -i 's/import React, { /import { /g' components/dashboard/credits/admin-topup-dialog.tsx
sed -i 's/import React, { /import { /g' components/dashboard/credits/auto-topup-batch-dialog.tsx
sed -i 's/import React, { /import { /g' components/dashboard/credits/auto-topup-dialog.tsx
sed -i 's/import React, { /import { /g' components/dashboard/provider-keys/provider-key-dialog.tsx

# 修复其他未使用的导入 - 需要手动检查每个文件
echo "已修复 React 导入问题"
