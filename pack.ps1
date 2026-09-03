Remove-Item -Path .\addon.xpi
Get-ChildItem -Path .\addon\ -Exclude pack.ps1,*.xpi,META-INF | Compress-Archive -CompressionLevel NoCompression -DestinationPath addon
Rename-Item -Path .\addon.zip -NewName addon.xpi
