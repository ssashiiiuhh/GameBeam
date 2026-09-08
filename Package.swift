// swift-tools-version: 5.10
import PackageDescription

let package = Package(
    name: "GameBeam",
    platforms: [
        .macOS(.v14)
    ],
    products: [
        .executable(name: "GameBeam", targets: ["GameBeam"])
    ],
    dependencies: [],
    targets: [
        .executableTarget(
            name: "GameBeam",
            dependencies: [],
            path: "Sources/GameBeam"
        ),
        .testTarget(
            name: "GameBeamTests",
            dependencies: ["GameBeam"],
            path: "Tests/GameBeamTests"
        )
    ]
)
