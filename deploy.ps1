# UniGo AWS Deployment Script
# Deploys static site to S3 with CloudFront CDN
# Prerequisites: AWS CLI installed and configured (aws configure)

$BUCKET_NAME = "unigo-site-$(Get-Random -Maximum 99999)"
$REGION = "us-east-1"

Write-Host "=== UniGo AWS Deployment ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create S3 bucket
Write-Host "[1/5] Creating S3 bucket: $BUCKET_NAME" -ForegroundColor Yellow
aws s3 mb "s3://$BUCKET_NAME" --region $REGION

# Step 2: Configure bucket for static website hosting
Write-Host "[2/5] Configuring static website hosting..." -ForegroundColor Yellow
aws s3 website "s3://$BUCKET_NAME" --index-document index.html --error-document login.html

# Step 3: Set bucket policy for public read access
Write-Host "[3/5] Setting public read policy..." -ForegroundColor Yellow
$policy = @"
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
        }
    ]
}
"@
$policy | Out-File -FilePath "bucket-policy.json" -Encoding utf8
aws s3api put-public-access-block --bucket $BUCKET_NAME --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"
aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy file://bucket-policy.json
Remove-Item bucket-policy.json

# Step 4: Upload all files with correct content types
Write-Host "[4/5] Uploading files..." -ForegroundColor Yellow
aws s3 sync . "s3://$BUCKET_NAME" --exclude ".git/*" --exclude "deploy.ps1" --exclude "README.md" --exclude "bucket-policy.json" --content-type "text/html"
aws s3 cp css/styles.css "s3://$BUCKET_NAME/css/styles.css" --content-type "text/css"
aws s3 cp js/app.js "s3://$BUCKET_NAME/js/app.js" --content-type "application/javascript"
aws s3 cp js/map-study.js "s3://$BUCKET_NAME/js/map-study.js" --content-type "application/javascript"
aws s3 cp js/map-food.js "s3://$BUCKET_NAME/js/map-food.js" --content-type "application/javascript"

# Step 5: Create CloudFront distribution
Write-Host "[5/5] Creating CloudFront distribution (this may take a few minutes)..." -ForegroundColor Yellow
$cfConfig = @"
{
    "CallerReference": "$BUCKET_NAME-$(Get-Date -Format 'yyyyMMddHHmmss')",
    "Origins": {
        "Quantity": 1,
        "Items": [
            {
                "Id": "S3-$BUCKET_NAME",
                "DomainName": "$BUCKET_NAME.s3-website-$REGION.amazonaws.com",
                "CustomOriginConfig": {
                    "HTTPPort": 80,
                    "HTTPSPort": 443,
                    "OriginProtocolPolicy": "http-only"
                }
            }
        ]
    },
    "DefaultCacheBehavior": {
        "TargetOriginId": "S3-$BUCKET_NAME",
        "ViewerProtocolPolicy": "redirect-to-https",
        "AllowedMethods": {
            "Quantity": 2,
            "Items": ["HEAD", "GET"],
            "CachedMethods": {
                "Quantity": 2,
                "Items": ["HEAD", "GET"]
            }
        },
        "ForwardedValues": {
            "QueryString": false,
            "Cookies": { "Forward": "none" }
        },
        "MinTTL": 0,
        "DefaultTTL": 86400,
        "MaxTTL": 31536000,
        "Compress": true
    },
    "Comment": "UniGo Static Site",
    "Enabled": true,
    "DefaultRootObject": "login.html",
    "ViewerCertificate": {
        "CloudFrontDefaultCertificate": true
    }
}
"@
$cfConfig | Out-File -FilePath "cf-config.json" -Encoding utf8
$cfResult = aws cloudfront create-distribution --distribution-config file://cf-config.json --output json | ConvertFrom-Json
Remove-Item cf-config.json

$distributionId = $cfResult.Distribution.Id
$domainName = $cfResult.Distribution.DomainName

Write-Host ""
Write-Host "=== DEPLOYMENT COMPLETE ===" -ForegroundColor Green
Write-Host ""
Write-Host "S3 Website URL: http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com" -ForegroundColor White
Write-Host "CloudFront URL: https://$domainName" -ForegroundColor White
Write-Host ""
Write-Host "Note: CloudFront may take 5-15 minutes to fully deploy." -ForegroundColor Gray
Write-Host "The CloudFront URL provides HTTPS (required for geolocation to work)." -ForegroundColor Gray
Write-Host ""
Write-Host "Distribution ID: $distributionId (save this for future updates)" -ForegroundColor Gray
Write-Host "Bucket Name: $BUCKET_NAME" -ForegroundColor Gray
