@echo off
chcp 65001 >nul
echo ============================================
echo  卖料平台 - 公网映射（localtunnel）
echo ============================================
echo.
echo 前提：本地服务已在 http://localhost:3000 运行
echo       （开发模式 npm run dev:server 或生产 npm start）
echo.
echo 映射启动后，请从输出中找到 https://xxxx.loca.lt 地址，
echo 复制到手机或其他设备即可访问（首次访问需输入公网 IP 验证）。
echo 按 Ctrl+C 可停止映射。
echo.
npx localtunnel --port 3000
pause
