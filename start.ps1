Write-Host "Starting BotStock system..." -ForegroundColor Green
if (!(Test-Path -Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}
Write-Host "Starting the development server..." -ForegroundColor Green
npm run dev
