#!/usr/bin/env pwsh

# Upload test file to OCR service
$imagePath = "C:\Users\Admin\Downloads\tfrenzy-handwritten-document-intelligence-platform\backend\uploads\1786259307146-efab53d7-138c-4135-a4ad-2b9757eede90.png"
$serverUrl = "http://localhost:3000/api/documents/upload"

if (-not (Test-Path $imagePath)) {
    Write-Error "Image not found: $imagePath"
    exit 1
}

Write-Host "[UPLOAD-TEST] Starting upload..."
Write-Host "[UPLOAD-TEST] File: $imagePath"
Write-Host "[UPLOAD-TEST] Size: $((Get-Item $imagePath).Length) bytes"
Write-Host "[UPLOAD-TEST] Endpoint: $serverUrl"
Write-Host ""

$fileStream = [System.IO.File]::OpenRead($imagePath)
$boundary = [System.Guid]::NewGuid().ToString()
$LF = "`r`n"

$bodyLines = @(
    "--$boundary",
    "Content-Disposition: form-data; name=`"file`"; filename=`"$(Split-Path $imagePath -Leaf)`"",
    "Content-Type: image/png",
    "",
    [System.Text.Encoding]::GetEncoding('iso-8859-1').GetString([System.IO.File]::ReadAllBytes($imagePath)),
    "--$boundary--"
)

try {
    $request = [System.Net.HttpWebRequest]::Create($serverUrl)
    $request.Method = "POST"
    $request.ContentType = "multipart/form-data; boundary=$boundary"
    $request.AllowAutoRedirect = $false
    
    $body = [System.Text.Encoding]::UTF8.GetBytes(($bodyLines -join $LF))
    $request.ContentLength = $body.Length
    
    $requestStream = $request.GetRequestStream()
    $requestStream.Write($body, 0, $body.Length)
    $requestStream.Close()
    
    $response = $request.GetResponse()
    $stream = $response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $content = $reader.ReadToEnd()
    $reader.Close()
    $stream.Close()
    $response.Close()
    
    Write-Host "[UPLOAD-TEST] Response:"
    Write-Host $content
    
    # Parse and extract document ID
    if ($content -match '"id":"([^"]+)"') {
        $docId = $matches[1]
        Write-Host ""
        Write-Host "[UPLOAD-TEST] Document ID: $docId"
        
        # Check for debug crops
        Start-Sleep -Milliseconds 3000
        
        $debugDir = "C:\Users\Admin\Downloads\tfrenzy-handwritten-document-intelligence-platform\backend\debug-crops\$docId"
        if (Test-Path $debugDir) {
            Write-Host "[UPLOAD-TEST] Debug crops directory created:"
            Get-ChildItem $debugDir | ForEach-Object {
                Write-Host "  - $($_.Name) ($($_.Length) bytes)"
            }
        } else {
            Write-Host "[UPLOAD-TEST] Waiting for debug crops directory..."
        }
    }
    
} catch {
    Write-Error "Upload failed: $_"
    exit 1
}
