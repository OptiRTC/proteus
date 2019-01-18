
export enum Platforms {
    ELECTRON,
    PHOTON,
    BORON,
    ARGON,
    XENON,
    x86,
    x86_64
};

export const PlatformsName = new Map<number, string>([
    [Platforms.ELECTRON, "electron"],
    [Platforms.PHOTON, "photon"],
    [Platforms.BORON, "boron"],
    [Platforms.ARGON, "argon"],
    [Platforms.XENON, "xenon"],
    [Platforms.x86, "x86"],
    [Platforms.x86_64, "x86_64"]
]);
