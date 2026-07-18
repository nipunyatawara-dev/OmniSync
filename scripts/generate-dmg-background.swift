#!/usr/bin/env swift
/**
 * Generates build/dmg/background.png and build/dmg/background@2x.png
 * for the macOS DMG drag-to-Applications window.
 *
 * electron-builder contents x/y: icon centers, origin TOP-LEFT (y down).
 * NSBitmapImageRep context on macOS: origin BOTTOM-LEFT (y up, isFlipped=false).
 * Convert with appKitY = H - topY. Do not flip the CTM (that inverts text).
 *
 *   OmniSync.app → (140, 220)  [top-left space]
 *   Applications → (400, 220)
 *   Window:        540 × 380
 */
import AppKit
import Foundation

let outDir = URL(fileURLWithPath: CommandLine.arguments.count > 1
  ? CommandLine.arguments[1]
  : FileManager.default.currentDirectoryPath + "/build/dmg")

try FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)

let W: CGFloat = 540
let H: CGFloat = 380

/// electron-builder / top-left point → AppKit bitmap point (bottom-left)
func pt(_ topX: CGFloat, _ topY: CGFloat) -> NSPoint {
  NSPoint(x: topX, y: H - topY)
}

let appCenter = pt(140, 220)
let appsCenter = pt(400, 220)

func releaseLabel() -> String {
  let pkg = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
    .appendingPathComponent("package.json")
  guard let data = try? Data(contentsOf: pkg),
        let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
        let release = json["omnisyncRelease"] as? String else {
    return "v0.4b"
  }
  return release.hasPrefix("v") ? release : "v\(release)"
}

let versionText = releaseLabel()

func drawRadialGlow(center: NSPoint, radius: CGFloat, color: NSColor) {
  let gradient = NSGradient(colors: [color, color.withAlphaComponent(0)])!
  let rect = NSRect(x: center.x - radius, y: center.y - radius, width: radius * 2, height: radius * 2)
  gradient.draw(in: NSBezierPath(ovalIn: rect), relativeCenterPosition: .zero)
}

func drawPad(center: NSPoint, accent: NSColor) {
  let r: CGFloat = 58
  let rect = NSRect(x: center.x - r, y: center.y - r, width: r * 2, height: r * 2)
  let path = NSBezierPath(ovalIn: rect)
  NSColor(calibratedWhite: 1, alpha: 0.04).setFill()
  path.fill()
  accent.withAlphaComponent(0.35).setStroke()
  path.lineWidth = 1.25
  path.stroke()

  let inner = NSBezierPath(ovalIn: rect.insetBy(dx: 6, dy: 6))
  accent.withAlphaComponent(0.12).setStroke()
  inner.lineWidth = 1
  inner.stroke()
}

func drawArrow(from start: NSPoint, to end: NSPoint) {
  let cyan = NSColor(calibratedRed: 0.30, green: 0.82, blue: 0.95, alpha: 0.85)
  let lime = NSColor(calibratedRed: 0.55, green: 0.92, blue: 0.40, alpha: 0.85)
  let grad = NSGradient(starting: cyan, ending: lime)!

  let barHeight: CGFloat = 3.5
  let bar = NSRect(
    x: start.x,
    y: start.y - barHeight / 2,
    width: (end.x - 10) - start.x,
    height: barHeight
  )
  let barPath = NSBezierPath(roundedRect: bar, xRadius: barHeight / 2, yRadius: barHeight / 2)
  grad.draw(in: barPath, angle: 0)

  let head = NSBezierPath()
  head.move(to: end)
  head.line(to: NSPoint(x: end.x - 14, y: end.y - 9))
  head.line(to: NSPoint(x: end.x - 14, y: end.y + 9))
  head.close()
  lime.setFill()
  head.fill()
}

func drawInfinityHint(at center: NSPoint, width: CGFloat) {
  let path = NSBezierPath()
  let h = width * 0.38
  path.move(to: NSPoint(x: center.x - width / 2, y: center.y))
  path.curve(
    to: NSPoint(x: center.x, y: center.y),
    controlPoint1: NSPoint(x: center.x - width / 3, y: center.y - h),
    controlPoint2: NSPoint(x: center.x - width / 6, y: center.y + h)
  )
  path.curve(
    to: NSPoint(x: center.x + width / 2, y: center.y),
    controlPoint1: NSPoint(x: center.x + width / 6, y: center.y - h),
    controlPoint2: NSPoint(x: center.x + width / 3, y: center.y + h)
  )
  path.curve(
    to: NSPoint(x: center.x, y: center.y),
    controlPoint1: NSPoint(x: center.x + width / 3, y: center.y - h),
    controlPoint2: NSPoint(x: center.x + width / 6, y: center.y + h)
  )
  path.curve(
    to: NSPoint(x: center.x - width / 2, y: center.y),
    controlPoint1: NSPoint(x: center.x - width / 6, y: center.y - h),
    controlPoint2: NSPoint(x: center.x - width / 3, y: center.y + h)
  )
  NSColor(calibratedWhite: 1, alpha: 0.06).setStroke()
  path.lineWidth = 2.5
  path.stroke()
}

func drawLabel(
  _ text: String,
  at point: NSPoint,
  size: CGFloat,
  weight: NSFont.Weight,
  color: NSColor
) {
  let font = NSFont.systemFont(ofSize: size, weight: weight)
  let attrs: [NSAttributedString.Key: Any] = [
    .font: font,
    .foregroundColor: color,
  ]
  let str = NSAttributedString(string: text, attributes: attrs)
  let textSize = str.size()
  str.draw(at: NSPoint(x: point.x - textSize.width / 2, y: point.y - textSize.height / 2))
}

func render(scale: CGFloat) throws -> NSImage {
  let pixelW = Int(W * scale)
  let pixelH = Int(H * scale)

  let rep = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: pixelW,
    pixelsHigh: pixelH,
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: 0,
    bitsPerPixel: 0
  )!
  rep.size = NSSize(width: W, height: H)

  NSGraphicsContext.saveGraphicsState()
  let ctx = NSGraphicsContext(bitmapImageRep: rep)!
  NSGraphicsContext.current = ctx
  ctx.imageInterpolation = .high
  ctx.shouldAntialias = true

  let bg = NSGradient(
    colors: [
      NSColor(calibratedRed: 0.06, green: 0.08, blue: 0.11, alpha: 1),
      NSColor(calibratedRed: 0.09, green: 0.11, blue: 0.14, alpha: 1),
      NSColor(calibratedRed: 0.04, green: 0.05, blue: 0.07, alpha: 1),
    ],
    atLocations: [0, 0.45, 1],
    colorSpace: .genericRGB
  )!
  bg.draw(in: NSRect(x: 0, y: 0, width: W, height: H), angle: -70)

  drawRadialGlow(
    center: pt(120, 90),
    radius: 180,
    color: NSColor(calibratedRed: 0.20, green: 0.72, blue: 0.95, alpha: 0.22)
  )
  drawRadialGlow(
    center: pt(420, 280),
    radius: 200,
    color: NSColor(calibratedRed: 0.45, green: 0.92, blue: 0.35, alpha: 0.18)
  )
  drawRadialGlow(
    center: pt(270, 200),
    radius: 160,
    color: NSColor(calibratedRed: 0.25, green: 0.80, blue: 0.70, alpha: 0.10)
  )

  let dot = NSColor(calibratedWhite: 1, alpha: 0.045)
  for x in stride(from: 18 as CGFloat, through: W, by: 28) {
    for y in stride(from: 18 as CGFloat, through: H, by: 28) {
      let path = NSBezierPath(ovalIn: NSRect(x: x, y: y, width: 1.5, height: 1.5))
      dot.setFill()
      path.fill()
    }
  }

  drawInfinityHint(at: pt(270, 188), width: 72)
  drawPad(
    center: appCenter,
    accent: NSColor(calibratedRed: 0.25, green: 0.78, blue: 0.95, alpha: 1)
  )
  drawPad(
    center: appsCenter,
    accent: NSColor(calibratedRed: 0.50, green: 0.90, blue: 0.40, alpha: 1)
  )
  drawArrow(from: pt(210, 220), to: pt(330, 220))

  drawLabel(
    "OmniSync",
    at: pt(W / 2, 48),
    size: 22,
    weight: .semibold,
    color: NSColor(calibratedWhite: 0.96, alpha: 0.95)
  )
  drawLabel(
    "Drag the app into Applications to install",
    at: pt(W / 2, 78),
    size: 12,
    weight: .regular,
    color: NSColor(calibratedWhite: 0.78, alpha: 0.75)
  )
  drawLabel(
    versionText,
    at: pt(W / 2, H - 28),
    size: 10,
    weight: .medium,
    color: NSColor(calibratedWhite: 0.55, alpha: 0.55)
  )

  NSGraphicsContext.restoreGraphicsState()

  let image = NSImage(size: NSSize(width: W, height: H))
  image.addRepresentation(rep)
  return image
}

func writePNG(_ image: NSImage, to url: URL) throws {
  guard let tiff = image.tiffRepresentation,
        let rep = NSBitmapImageRep(data: tiff),
        let png = rep.representation(using: .png, properties: [:]) else {
    throw NSError(
      domain: "dmg-bg",
      code: 1,
      userInfo: [NSLocalizedDescriptionKey: "PNG encode failed"]
    )
  }
  try png.write(to: url)
}

do {
  let oneX = try render(scale: 1)
  let twoX = try render(scale: 2)
  try writePNG(oneX, to: outDir.appendingPathComponent("background.png"))
  try writePNG(twoX, to: outDir.appendingPathComponent("background@2x.png"))
  fputs("Wrote \(outDir.path)/background.png and background@2x.png\n", stderr)
  fputs("Pad centers (PNG top-left px): (140, 220) and (400, 220)\n", stderr)
} catch {
  fputs("Failed to generate DMG background: \(error)\n", stderr)
  exit(1)
}
