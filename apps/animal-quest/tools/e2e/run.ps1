# 用法示例：
#   powershell -File run.ps1 -Url "http://127.0.0.1:5173/" `
#     -Actions "wait:900,press:Enter,wait:400,shot:flow.png"
param(
  [Parameter(Mandatory = $true)][string]$Url,
  [Parameter(Mandatory = $true)][string]$Actions,
  [int]$Port = 9223
)

$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$job = @{ url = $Url; actions = $Actions; port = $Port } | ConvertTo-Json
Set-Content -Path (Join-Path $dir "job.json") -Value $job -Encoding UTF8
node (Join-Path $dir "run.js")
