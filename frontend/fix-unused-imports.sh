#!/bin/bash

# 修复未使用的 React 导入
find app components -name "*.tsx" -type f -exec sed -i "/^import React from 'react';$/d" {} \;
find app components -name "*.tsx" -type f -exec sed -i '/^import React from "react";$/d' {} \;

echo "已移除未使用的 React 导入"
