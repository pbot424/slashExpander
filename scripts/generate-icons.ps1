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

  $coral = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#ff4a3d"))
  $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  $shape = New-RoundedRectanglePath 0 0 $size $size ($size * 0.2)
  $graphics.FillPath($coral, $shape)

  $slash = New-Object System.Drawing.Drawing2D.GraphicsPath
  $slash.AddPolygon([System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new($size * 0.58, $size * 0.19),
    [System.Drawing.PointF]::new($size * 0.72, $size * 0.19),
    [System.Drawing.PointF]::new($size * 0.42, $size * 0.81),
    [System.Drawing.PointF]::new($size * 0.28, $size * 0.81)
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
