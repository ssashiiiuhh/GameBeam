import SwiftUI

public enum LiquidGlassVariant: Sendable {
    case clear
    case regular
    case identity
}

public enum GlassTheme: String, CaseIterable, Identifiable, Sendable, Equatable, Hashable {
    case clear = "clear"
    case smoked = "smoked"
    case midnight = "midnight"
    
    public var id: String { rawValue }
    
    public var title: String {
        switch self {
        case .clear: return "Clear"
        case .smoked: return "Smoked"
        case .midnight: return "Midnight"
        }
    }
    
    public var subtitle: String {
        switch self {
        case .clear: return "Pure transparency & specular rim"
        case .smoked: return "Obsidian glass & silver highlights"
        case .midnight: return "Sapphire tint & cyan edge glow"
        }
    }
    
    public var accentColor: Color {
        switch self {
        case .clear: return Color.white
        case .smoked: return Color(red: 0.75, green: 0.80, blue: 0.88)
        case .midnight: return Color(red: 0.22, green: 0.74, blue: 0.97)
        }
    }
    
    public var tintColor: Color {
        switch self {
        case .clear: return .black
        case .smoked: return .black
        case .midnight: return Color(red: 0.05, green: 0.08, blue: 0.20)
        }
    }
    
    public var tintOpacity: Double {
        switch self {
        case .clear: return 0.04
        case .smoked: return 0.28
        case .midnight: return 0.18
        }
    }
    
    public var specularRimStops: [Gradient.Stop] {
        switch self {
        case .clear:
            return [
                .init(color: Color.white.opacity(0.98), location: 0.0),
                .init(color: Color.white.opacity(0.48), location: 0.18),
                .init(color: Color.white.opacity(0.12), location: 0.48),
                .init(color: Color.white.opacity(0.20), location: 0.80),
                .init(color: Color.white.opacity(0.42), location: 1.0)
            ]
        case .smoked:
            return [
                .init(color: Color.white.opacity(0.78), location: 0.0),
                .init(color: Color.white.opacity(0.28), location: 0.20),
                .init(color: Color.white.opacity(0.08), location: 0.50),
                .init(color: Color.white.opacity(0.14), location: 0.80),
                .init(color: Color.white.opacity(0.32), location: 1.0)
            ]
        case .midnight:
            return [
                .init(color: Color(red: 0.60, green: 0.90, blue: 1.0).opacity(0.98), location: 0.0),
                .init(color: Color(red: 0.38, green: 0.72, blue: 0.98).opacity(0.50), location: 0.20),
                .init(color: Color.white.opacity(0.12), location: 0.50),
                .init(color: Color(red: 0.22, green: 0.58, blue: 0.92).opacity(0.28), location: 0.80),
                .init(color: Color(red: 0.48, green: 0.88, blue: 1.0).opacity(0.50), location: 1.0)
            ]
        }
    }
    
    public var ambientShadowColor: Color {
        switch self {
        case .clear: return Color.black.opacity(0.38)
        case .smoked: return Color.black.opacity(0.55)
        case .midnight: return Color(red: 0.05, green: 0.15, blue: 0.35).opacity(0.45)
        }
    }
    
    public var accentGlowColor: Color {
        switch self {
        case .clear: return Color.white.opacity(0.08)
        case .smoked: return Color.black.opacity(0.20)
        case .midnight: return Color(red: 0.22, green: 0.74, blue: 0.97).opacity(0.25)
        }
    }
    
    public static func from(_ raw: String) -> GlassTheme {
        switch raw.lowercased() {
        case "smoked", "smoke", "dark":
            return .smoked
        case "midnight", "navy", "sapphire":
            return .midnight
        case "clear", "crystal":
            return .clear
        default:
            // Graceful fallback for legacy themes ("frostbolt", "regrowth", etc.)
            return .clear
        }
    }
}

public struct SharedGlassContainer<Content: View>: View {
    @ViewBuilder public let content: () -> Content
    
    public init(@ViewBuilder content: @escaping () -> Content) {
        self.content = content
    }
    
    public var body: some View {
        if #available(macOS 26.0, *) {
            GlassEffectContainer {
                content()
            }
        } else {
            content()
        }
    }
}

public struct LiquidGlassModifier: ViewModifier {
    public var cornerRadius: CGFloat
    public var tintColor: Color?
    public var tintOpacity: Double?
    public var variant: LiquidGlassVariant
    public var theme: GlassTheme
    
    public init(
        cornerRadius: CGFloat = 24,
        tintColor: Color? = nil,
        tintOpacity: Double? = nil,
        variant: LiquidGlassVariant = .clear,
        theme: GlassTheme = .clear,
        isMetalBackdrop: Bool = false
    ) {
        self.cornerRadius = cornerRadius
        self.tintColor = tintColor
        self.tintOpacity = tintOpacity
        self.variant = variant
        self.theme = theme
    }
    
    public init(
        cornerRadius: CGFloat = 24,
        tintColor: Color? = nil,
        tintOpacity: Double? = nil,
        variant: LiquidGlassVariant = .clear,
        themeName: String,
        isMetalBackdrop: Bool = false
    ) {
        self.init(
            cornerRadius: cornerRadius,
            tintColor: tintColor,
            tintOpacity: tintOpacity,
            variant: variant,
            theme: GlassTheme.from(themeName)
        )
    }
    
    private var effectiveTintColor: Color {
        tintColor ?? theme.tintColor
    }
    
    private var effectiveTintOpacity: Double {
        tintOpacity ?? theme.tintOpacity
    }
    
    @ViewBuilder
    public func body(content: Content) -> some View {
        if #available(macOS 26.0, *) {
            content
                // 1. Native macOS 26 Apple Liquid Glass Refraction Engine (.clear high transparency)
                .glassEffect(
                    variant == .clear
                        ? (effectiveTintOpacity > 0 ? .clear.tint(effectiveTintColor.opacity(effectiveTintOpacity)).interactive() : .clear.interactive())
                        : (variant == .regular
                            ? (effectiveTintOpacity > 0 ? .regular.tint(effectiveTintColor.opacity(effectiveTintOpacity)).interactive() : .regular.interactive())
                            : .identity),
                    in: .rect(cornerRadius: cornerRadius)
                )
                // 2. Diagonal Caustic Light Sweep across upper face
                .overlay(diagonalCausticSweepOverlay)
                // 3. Prismatic Edge Dispersion along curved perimeter (n ≈ 1.52 crown glass)
                .overlay(prismaticDispersionOverlay)
                // 4. Double-Walled Meniscus Rim: Outer 1.5pt specular rim + Inner 1.0pt refraction shelf
                .overlay(specularRimOverlay)
                .overlay(insetBevelOverlay)
                // 5. Glossy Liquid Surface Sheen
                .overlay(surfaceSheenOverlay)
                // 6. Deep Floating Drop Shadows & Ambient Tint
                .shadow(color: theme.ambientShadowColor, radius: 24, x: 0, y: 12)
                .shadow(color: theme.accentGlowColor, radius: 10, x: 0, y: 0)
        } else {
            content
                .background(
                    ZStack {
                        VisualEffectView(material: .hudWindow, blendingMode: .behindWindow)
                        RadialGradient(
                            colors: [theme.accentColor.opacity(0.12), Color.clear],
                            center: .topLeading,
                            startRadius: 0,
                            endRadius: 200
                        )
                        effectiveTintColor.opacity(effectiveTintOpacity)
                    }
                    .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
                )
                .overlay(diagonalCausticSweepOverlay)
                .overlay(prismaticDispersionOverlay)
                .overlay(specularRimOverlay)
                .overlay(insetBevelOverlay)
                .overlay(surfaceSheenOverlay)
                .shadow(color: theme.ambientShadowColor, radius: 24, x: 0, y: 14)
                .shadow(color: theme.accentGlowColor, radius: 10, x: 0, y: 0)
        }
    }
    
    // MARK: - Double-Walled Meniscus Rim (Outer 1.5pt Specular Rim)
    private var specularRimOverlay: some View {
        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
            .strokeBorder(
                LinearGradient(
                    stops: theme.specularRimStops,
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ),
                lineWidth: 1.5
            )
            .allowsHitTesting(false)
    }
    
    // MARK: - Double-Walled Meniscus Rim (Inner 1.0pt Inset Refraction Shelf)
    private var insetBevelOverlay: some View {
        RoundedRectangle(cornerRadius: max(cornerRadius - 1.2, 0), style: .continuous)
            .strokeBorder(
                LinearGradient(
                    stops: [
                        .init(color: Color.white.opacity(theme == .smoked ? 0.35 : 0.65), location: 0.0),
                        .init(color: Color.white.opacity(theme == .smoked ? 0.12 : 0.22), location: 0.20),
                        .init(color: Color.clear, location: 0.46),
                        .init(color: Color.clear, location: 0.72),
                        .init(color: Color.white.opacity(theme == .smoked ? 0.08 : 0.20), location: 1.0)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ),
                lineWidth: 1.0
            )
            .padding(1.2)
            .allowsHitTesting(false)
    }
    
    // MARK: - Prismatic Edge Dispersion (Crown Glass n ≈ 1.52)
    private var prismaticDispersionOverlay: some View {
        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
            .strokeBorder(
                LinearGradient(
                    stops: [
                        .init(color: Color.clear, location: 0.0),
                        .init(color: Color.clear, location: 0.46),
                        .init(color: Color(red: 0.12, green: 0.88, blue: 0.96).opacity(theme == .smoked ? 0.22 : 0.36), location: 0.64), // subtle cyan
                        .init(color: Color(red: 0.38, green: 0.48, blue: 1.00).opacity(theme == .smoked ? 0.20 : 0.32), location: 0.78), // blue
                        .init(color: Color(red: 0.90, green: 0.30, blue: 0.84).opacity(theme == .smoked ? 0.18 : 0.28), location: 0.90), // magenta
                        .init(color: Color(red: 1.00, green: 0.72, blue: 0.28).opacity(theme == .smoked ? 0.14 : 0.22), location: 1.00)  // warm amber
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ),
                lineWidth: 1.2
            )
            .blendMode(.plusLighter)
            .allowsHitTesting(false)
    }
    
    // MARK: - Diagonal Caustic Light Sweep
    private var diagonalCausticSweepOverlay: some View {
        LinearGradient(
            stops: [
                .init(color: Color.clear, location: 0.0),
                .init(color: Color.white.opacity(theme == .smoked ? 0.04 : 0.13), location: 0.18),
                .init(color: Color.white.opacity(theme == .smoked ? 0.09 : 0.22), location: 0.27),
                .init(color: Color.white.opacity(theme == .smoked ? 0.03 : 0.07), location: 0.36),
                .init(color: Color.clear, location: 0.50)
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
        .allowsHitTesting(false)
    }
    
    // MARK: - Glossy Surface Sheen
    private var surfaceSheenOverlay: some View {
        VStack {
            LinearGradient(
                stops: [
                    .init(color: Color.white.opacity(theme == .smoked ? 0.14 : 0.24), location: 0.0),
                    .init(color: Color.white.opacity(theme == .smoked ? 0.03 : 0.06), location: 0.38),
                    .init(color: Color.clear, location: 1.0)
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .frame(height: 38)
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
            Spacer()
        }
        .allowsHitTesting(false)
    }
}

public struct GlassCapsuleModifier: ViewModifier {
    public var cornerRadius: CGFloat
    public var theme: GlassTheme
    public var isInteractive: Bool
    
    public init(cornerRadius: CGFloat = 20, theme: GlassTheme = .clear, isInteractive: Bool = false) {
        self.cornerRadius = cornerRadius
        self.theme = theme
        self.isInteractive = isInteractive
    }
    
    public init(cornerRadius: CGFloat = 20, themeName: String, isInteractive: Bool = false) {
        self.init(cornerRadius: cornerRadius, theme: GlassTheme.from(themeName), isInteractive: isInteractive)
    }
    
    @ViewBuilder
    public func body(content: Content) -> some View {
        if #available(macOS 26.0, *) {
            content
                .glassEffect(
                    .regular.tint(theme.accentColor.opacity(theme == .clear ? 0.04 : 0.12)).interactive(),
                    in: .rect(cornerRadius: cornerRadius)
                )
                .overlay(specularBorder)
                .shadow(color: theme.ambientShadowColor, radius: 20, x: 0, y: 10)
                .shadow(color: theme.accentGlowColor, radius: 14, x: 0, y: 0)
        } else {
            content
                .background(
                    ZStack {
                        VisualEffectView(material: .hudWindow, blendingMode: .behindWindow)
                        RadialGradient(
                            colors: [theme.accentColor.opacity(0.12), Color.clear],
                            center: .topLeading,
                            startRadius: 0,
                            endRadius: 220
                        )
                        theme.tintColor.opacity(theme.tintOpacity)
                    }
                    .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
                )
                .overlay(specularBorder)
                .shadow(color: theme.ambientShadowColor, radius: 18, x: 0, y: 10)
                .shadow(color: theme.accentGlowColor, radius: 14, x: 0, y: 0)
        }
    }
    
    private var specularBorder: some View {
        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
            .strokeBorder(
                LinearGradient(
                    stops: theme.specularRimStops,
                    startPoint: .top,
                    endPoint: .bottom
                ),
                lineWidth: 1
            )
    }
}

public extension View {
    func liquidGlassCapsule(cornerRadius: CGFloat = 20, theme: GlassTheme = .clear, isInteractive: Bool = false) -> some View {
        self.modifier(GlassCapsuleModifier(cornerRadius: cornerRadius, theme: theme, isInteractive: isInteractive))
    }
    
    func liquidGlassCapsule(cornerRadius: CGFloat = 20, theme: String, isInteractive: Bool = false) -> some View {
        self.modifier(GlassCapsuleModifier(cornerRadius: cornerRadius, themeName: theme, isInteractive: isInteractive))
    }
    
    func trueLiquidGlass(
        cornerRadius: CGFloat = 24,
        theme: GlassTheme = .clear,
        variant: LiquidGlassVariant = .clear,
        tintColor: Color? = nil,
        tintOpacity: Double? = nil,
        isMetalBackdrop: Bool = false
    ) -> some View {
        self.modifier(LiquidGlassModifier(
            cornerRadius: cornerRadius,
            tintColor: tintColor,
            tintOpacity: tintOpacity,
            variant: variant,
            theme: theme,
            isMetalBackdrop: isMetalBackdrop
        ))
    }
    
    func trueLiquidGlass(
        cornerRadius: CGFloat = 24,
        themeName: String,
        variant: LiquidGlassVariant = .clear,
        tintColor: Color? = nil,
        tintOpacity: Double? = nil
    ) -> some View {
        self.trueLiquidGlass(
            cornerRadius: cornerRadius,
            theme: GlassTheme.from(themeName),
            variant: variant,
            tintColor: tintColor,
            tintOpacity: tintOpacity
        )
    }
    
    func trueLiquidGlass(
        cornerRadius: CGFloat = 24,
        tintColor: Color,
        tintOpacity: Double,
        variant: LiquidGlassVariant = .clear,
        theme: String = "clear"
    ) -> some View {
        self.modifier(LiquidGlassModifier(
            cornerRadius: cornerRadius,
            tintColor: tintColor,
            tintOpacity: tintOpacity,
            variant: variant,
            theme: GlassTheme.from(theme)
        ))
    }
}
