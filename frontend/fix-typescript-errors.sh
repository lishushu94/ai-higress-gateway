#!/bin/bash

# 批量移除未使用的 React 导入
find components -name "*.tsx" -type f -exec sed -i 's/^import React from "react";$//' {} \;
find components -name "*.tsx" -type f -exec sed -i "s/^import React from 'react';$//" {} \;
find lib -name "*.tsx" -type f -exec sed -i 's/^import React from "react";$//' {} \;
find lib -name "*.tsx" -type f -exec sed -i "s/^import React from 'react';$//" {} \;

# 移除空行
find components lib -name "*.tsx" -type f -exec sed -i '/^$/N;/^\n$/d' {} \;

echo "已批量修复 TypeScript 错误"
