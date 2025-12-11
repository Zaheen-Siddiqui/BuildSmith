# BuildSmith Backend - Encryption Module
# Handles bundle encryption and decryption

# Note: common.ps1 functions are loaded by parent scripts

function Protect-Bundle {
    <#
    .SYNOPSIS
        Encrypt a bundle file with a password
    .PARAMETER BundlePath
        Path to the bundle ZIP file to encrypt
    .PARAMETER Password
        Password to encrypt the bundle with
    .PARAMETER OutputPath
        Optional output path for encrypted bundle (defaults to .encrypted extension)
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$BundlePath,
        
        [Parameter(Mandatory=$true)]
        [string]$Password,
        
        [Parameter(Mandatory=$false)]
        [string]$OutputPath
    )
    
    try {
        if (-not (Test-Path $BundlePath)) {
            throw "Bundle file not found: $BundlePath"
        }
        
        # Set output path
        if (-not $OutputPath) {
            $OutputPath = "$BundlePath.encrypted"
        }
        
        Emit-Log -StepId "encrypt" -Level "info" -Text "Encrypting bundle..."
        
        # Read bundle file
        $bundleBytes = [System.IO.File]::ReadAllBytes($BundlePath)
        
        # Derive key from password using PBKDF2
        $salt = New-Object byte[] 32
        $rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::new()
        $rng.GetBytes($salt)
        
        $pbkdf2 = New-Object System.Security.Cryptography.Rfc2898DeriveBytes($Password, $salt, 10000)
        $key = $pbkdf2.GetBytes(32)  # 256-bit key
        $iv = $pbkdf2.GetBytes(16)   # 128-bit IV
        
        # Encrypt using AES
        $aes = [System.Security.Cryptography.Aes]::Create()
        $aes.KeySize = 256
        $aes.Key = $key
        $aes.IV = $iv
        $aes.Mode = [System.Security.Cryptography.CipherMode]::CBC
        $aes.Padding = [System.Security.Cryptography.PaddingMode]::PKCS7
        
        $encryptor = $aes.CreateEncryptor()
        $encryptedBytes = $encryptor.TransformFinalBlock($bundleBytes, 0, $bundleBytes.Length)
        
        # Create output file with format: [salt][encrypted data]
        $outputBytes = $salt + $encryptedBytes
        [System.IO.File]::WriteAllBytes($OutputPath, $outputBytes)
        
        # Clean up
        $encryptor.Dispose()
        $aes.Dispose()
        $pbkdf2.Dispose()
        $rng.Dispose()
        
        Emit-Log -StepId "encrypt" -Level "success" -Text "Bundle encrypted: $OutputPath"
        
        return @{
            success = $true
            path = $OutputPath
            originalSize = $bundleBytes.Length
            encryptedSize = $outputBytes.Length
        }
    }
    catch {
        Emit-Log -StepId "encrypt" -Level "error" -Text "Encryption failed: $($_.Exception.Message)"
        return @{
            success = $false
            error = $_.Exception.Message
        }
    }
}

function Unprotect-Bundle {
    <#
    .SYNOPSIS
        Decrypt an encrypted bundle file
    .PARAMETER EncryptedPath
        Path to the encrypted bundle file
    .PARAMETER Password
        Password to decrypt the bundle with
    .PARAMETER OutputPath
        Optional output path for decrypted bundle (defaults to removing .encrypted extension)
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$EncryptedPath,
        
        [Parameter(Mandatory=$true)]
        [string]$Password,
        
        [Parameter(Mandatory=$false)]
        [string]$OutputPath
    )
    
    try {
        if (-not (Test-Path $EncryptedPath)) {
            throw "Encrypted file not found: $EncryptedPath"
        }
        
        # Set output path
        if (-not $OutputPath) {
            if ($EncryptedPath -match '(.+)\.encrypted$') {
                $OutputPath = $matches[1]
            } else {
                $OutputPath = "$EncryptedPath.decrypted"
            }
        }
        
        Emit-Log -StepId "decrypt" -Level "info" -Text "Decrypting bundle..."
        
        # Read encrypted file
        $encryptedData = [System.IO.File]::ReadAllBytes($EncryptedPath)
        
        # Extract salt (first 32 bytes)
        $salt = $encryptedData[0..31]
        $encryptedBytes = $encryptedData[32..($encryptedData.Length - 1)]
        
        # Derive key from password using same parameters
        $pbkdf2 = New-Object System.Security.Cryptography.Rfc2898DeriveBytes($Password, $salt, 10000)
        $key = $pbkdf2.GetBytes(32)
        $iv = $pbkdf2.GetBytes(16)
        
        # Decrypt using AES
        $aes = [System.Security.Cryptography.Aes]::Create()
        $aes.KeySize = 256
        $aes.Key = $key
        $aes.IV = $iv
        $aes.Mode = [System.Security.Cryptography.CipherMode]::CBC
        $aes.Padding = [System.Security.Cryptography.PaddingMode]::PKCS7
        
        $decryptor = $aes.CreateDecryptor()
        $decryptedBytes = $decryptor.TransformFinalBlock($encryptedBytes, 0, $encryptedBytes.Length)
        
        # Write decrypted file
        [System.IO.File]::WriteAllBytes($OutputPath, $decryptedBytes)
        
        # Clean up
        $decryptor.Dispose()
        $aes.Dispose()
        $pbkdf2.Dispose()
        
        Emit-Log -StepId "decrypt" -Level "success" -Text "Bundle decrypted: $OutputPath"
        
        return @{
            success = $true
            path = $OutputPath
            size = $decryptedBytes.Length
        }
    }
    catch {
        Emit-Log -StepId "decrypt" -Level "error" -Text "Decryption failed: $($_.Exception.Message)"
        return @{
            success = $false
            error = $_.Exception.Message
        }
    }
}

Export-ModuleMember -Function Protect-Bundle, Unprotect-Bundle
