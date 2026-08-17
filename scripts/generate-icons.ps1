Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$outputDir = Join-Path $projectRoot "assets\icons"
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

function New-RoundedRectanglePath([float]$x, [float]$y, [float]$width, [float]$height, [float]$radius) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $diameter = $radius * 2
  $path.AddArc($x, $y, $diameter, $diameter, 180, 90)
  $path.AddArc($x + $width - $diameter, $y, $diameter, $diameter, 270, 90)
  $path.AddArc($x + $width - $diameter, $y + $height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($x, $y + $height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

foreach ($size in @(16, 32, 48, 128)) {
  $bitmap = New-Object System.Drawing.Bitmap($size, $size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.Color]::Transparent)

  # Chrome recommends 96px artwork centered in the 128px store icon.
  $artSize = if ($size -eq 128) { 96 } else { $size }
  $offset = ($size - $artSize) / 2

  $coral = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#ff4a3d"))
  $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  $shape = New-RoundedRectanglePath $offset $offset $artSize $artSize ($artSize * 0.2)
  $graphics.FillPath($coral, $shape)

  $slash = New-Object System.Drawing.Drawing2D.GraphicsPath
  $slash.AddPolygon([System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new($offset + ($artSize * 0.58), $offset + ($artSize * 0.19)),
    [System.Drawing.PointF]::new($offset + ($artSize * 0.72), $offset + ($artSize * 0.19)),
    [System.Drawing.PointF]::new($offset + ($artSize * 0.42), $offset + ($artSize * 0.81)),
    [System.Drawing.PointF]::new($offset + ($artSize * 0.28), $offset + ($artSize * 0.81))
  ))
  $graphics.FillPath($white, $slash)

  $destination = Join-Path $outputDir "icon-$size.png"
  $bitmap.Save($destination, [System.Drawing.Imaging.ImageFormat]::Png)
  $slash.Dispose()
  $shape.Dispose()
  $white.Dispose()
  $coral.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

$storeOutputDir = Join-Path $projectRoot "store-listing"
New-Item -ItemType Directory -Force -Path $storeOutputDir | Out-Null

$promoBitmap = New-Object System.Drawing.Bitmap(440, 280)
$promoGraphics = [System.Drawing.Graphics]::FromImage($promoBitmap)
$promoGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$promoGraphics.Clear([System.Drawing.ColorTranslator]::FromHtml("#ff4a3d"))

$softWhite = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(38, 255, 255, 255))
$promoWhite = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$decorations = @(
  (New-RoundedRectanglePath 34 46 112 34 17),
  (New-RoundedRectanglePath 294 46 112 34 17),
  (New-RoundedRectanglePath 48 198 132 34 17),
  (New-RoundedRectanglePath 276 198 116 34 17)
)

foreach ($decoration in $decorations) {
  $promoGraphics.FillPath($softWhite, $decoration)
}

$promoSlash = New-Object System.Drawing.Drawing2D.GraphicsPath
$promoSlash.AddPolygon([System.Drawing.PointF[]]@(
  [System.Drawing.PointF]::new(222, 58),
  [System.Drawing.PointF]::new(258, 58),
  [System.Drawing.PointF]::new(204, 222),
  [System.Drawing.PointF]::new(168, 222)
))
$promoGraphics.FillPath($promoWhite, $promoSlash)

$promoDestination = Join-Path $storeOutputDir "small-promo-440x280.png"
$promoBitmap.Save($promoDestination, [System.Drawing.Imaging.ImageFormat]::Png)

$promoSlash.Dispose()
foreach ($decoration in $decorations) { $decoration.Dispose() }
$promoWhite.Dispose()
$softWhite.Dispose()
$promoGraphics.Dispose()
$promoBitmap.Dispose()
