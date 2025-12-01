#!/usr/bin/env bash
# 生成随机 SECRET_KEY，便于配置加密密钥
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
