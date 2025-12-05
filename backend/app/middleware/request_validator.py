"""
Request validation middleware to detect and block malicious requests.
"""

import re
from typing import Pattern

from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp


class RequestValidatorMiddleware(BaseHTTPMiddleware):
    """
    请求验证中间件，检测并阻止恶意请求。
    
    防护：
    - SQL 注入攻击
    - XSS 攻击
    - 路径遍历攻击
    - 命令注入
    - 可疑 User-Agent
    """

    # SQL 注入特征模式
    SQL_INJECTION_PATTERNS: list[Pattern] = [
        re.compile(r"(\bunion\b.*\bselect\b)", re.IGNORECASE),
        re.compile(r"(\bselect\b.*\bfrom\b)", re.IGNORECASE),
        re.compile(r"(\binsert\b.*\binto\b)", re.IGNORECASE),
        re.compile(r"(\bdelete\b.*\bfrom\b)", re.IGNORECASE),
        re.compile(r"(\bdrop\b.*\btable\b)", re.IGNORECASE),
        re.compile(r"(\bupdate\b.*\bset\b)", re.IGNORECASE),
        re.compile(r"(--|#|/\*|\*/|;)", re.IGNORECASE),
        re.compile(r"(\bor\b\s+\d+\s*=\s*\d+)", re.IGNORECASE),
        re.compile(r"(\band\b\s+\d+\s*=\s*\d+)", re.IGNORECASE),
        re.compile(r"('|\")(\s*or\s*|\s*and\s*)('|\")", re.IGNORECASE),
    ]

    # XSS 攻击特征模式
    XSS_PATTERNS: list[Pattern] = [
        re.compile(r"<script[^>]*>.*?</script>", re.IGNORECASE | re.DOTALL),
        re.compile(r"javascript:", re.IGNORECASE),
        re.compile(r"on\w+\s*=", re.IGNORECASE),  # onclick, onerror, etc.
        re.compile(r"<iframe[^>]*>", re.IGNORECASE),
        re.compile(r"<embed[^>]*>", re.IGNORECASE),
        re.compile(r"<object[^>]*>", re.IGNORECASE),
    ]

    # 路径遍历攻击模式
    PATH_TRAVERSAL_PATTERNS: list[Pattern] = [
        re.compile(r"\.\./"),
        re.compile(r"\.\./"),
        re.compile(r"%2e%2e/", re.IGNORECASE),
        re.compile(r"\.\.\\"),
    ]

    # 命令注入模式
    COMMAND_INJECTION_PATTERNS: list[Pattern] = [
        re.compile(r"[;&|`$]"),
        re.compile(r"\$\(.*\)"),
        re.compile(r"`.*`"),
    ]

    # 可疑的扫描工具 User-Agent
    SUSPICIOUS_USER_AGENTS: list[Pattern] = [
        re.compile(r"sqlmap", re.IGNORECASE),
        re.compile(r"nikto", re.IGNORECASE),
        re.compile(r"nmap", re.IGNORECASE),
        re.compile(r"masscan", re.IGNORECASE),
        re.compile(r"acunetix", re.IGNORECASE),
        re.compile(r"nessus", re.IGNORECASE),
        re.compile(r"openvas", re.IGNORECASE),
        re.compile(r"metasploit", re.IGNORECASE),
        re.compile(r"burp", re.IGNORECASE),
        re.compile(r"w3af", re.IGNORECASE),
        re.compile(r"dirbuster", re.IGNORECASE),
        re.compile(r"gobuster", re.IGNORECASE),
        re.compile(r"wfuzz", re.IGNORECASE),
        re.compile(r"havij", re.IGNORECASE),
    ]

    def __init__(
        self,
        app: ASGIApp,
        enable_sql_injection_check: bool = True,
        enable_xss_check: bool = True,
        enable_path_traversal_check: bool = True,
        enable_command_injection_check: bool = True,
        enable_user_agent_check: bool = True,
        log_suspicious_requests: bool = True,
    ):
        super().__init__(app)
        self.enable_sql_injection_check = enable_sql_injection_check
        self.enable_xss_check = enable_xss_check
        self.enable_path_traversal_check = enable_path_traversal_check
        self.enable_command_injection_check = enable_command_injection_check
        self.enable_user_agent_check = enable_user_agent_check
        self.log_suspicious_requests = log_suspicious_requests

    def _check_patterns(self, text: str, patterns: list[Pattern]) -> bool:
        """检查文本是否匹配任何恶意模式"""
        if not text:
            return False
        return any(pattern.search(text) for pattern in patterns)

    def _is_suspicious_request(self, request: Request) -> tuple[bool, str]:
        """
        检查请求是否可疑。
        
        Returns:
            (is_suspicious, reason)
        """
        # 检查 User-Agent
        if self.enable_user_agent_check:
            user_agent = request.headers.get("user-agent", "")
            if self._check_patterns(user_agent, self.SUSPICIOUS_USER_AGENTS):
                return True, "suspicious_user_agent"

        # 检查 URL 路径
        path = request.url.path
        query = str(request.url.query)

        if self.enable_path_traversal_check:
            if self._check_patterns(path, self.PATH_TRAVERSAL_PATTERNS):
                return True, "path_traversal_attempt"
            if self._check_patterns(query, self.PATH_TRAVERSAL_PATTERNS):
                return True, "path_traversal_in_query"

        if self.enable_sql_injection_check:
            if self._check_patterns(query, self.SQL_INJECTION_PATTERNS):
                return True, "sql_injection_in_query"

        if self.enable_xss_check:
            if self._check_patterns(query, self.XSS_PATTERNS):
                return True, "xss_in_query"

        if self.enable_command_injection_check:
            if self._check_patterns(query, self.COMMAND_INJECTION_PATTERNS):
                return True, "command_injection_in_query"

        return False, ""

    async def dispatch(self, request: Request, call_next):
        # 执行安全检查
        is_suspicious, reason = self._is_suspicious_request(request)

        if is_suspicious:
            if self.log_suspicious_requests:
                # 记录可疑请求（使用应用日志）
                import logging
                logger = logging.getLogger("apiproxy")
                logger.warning(
                    f"Blocked suspicious request: {reason} | "
                    f"IP: {request.client.host if request.client else 'unknown'} | "
                    f"Path: {request.url.path} | "
                    f"User-Agent: {request.headers.get('user-agent', 'none')}"
                )

            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={
                    "error": "forbidden",
                    "message": "请求被拒绝",
                },
            )

        # 继续处理正常请求
        return await call_next(request)