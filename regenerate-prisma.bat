@echo off
echo Stopping Node processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo Regenerating Prisma Client...
call npx prisma generate

echo Done! You can now run: npm run dev
pause
