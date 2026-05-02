import { GalaxyPlanetVisualDef, StrategicPlanetId } from "./strategicgalaxytypes";
import {
  GalaxyPlanetAssetKey,
  GalaxyRingTextureKey,
  GalaxySpaceStationInteraction,
  GalaxySpaceStationKind,
} from "@Glibs/world/galaxy/galaxytypes";

export const DefaultStrategicGalaxySelectedPlanetId = StrategicPlanetId.Atlas;

export const galaxyPlanetVisualDefs: Partial<Record<StrategicPlanetId, GalaxyPlanetVisualDef>> = {
  [StrategicPlanetId.Sirius]: {
    planetId: StrategicPlanetId.Sirius,
    radius: 1.02,
    assetKey: GalaxyPlanetAssetKey.AmberBands,
  },
  [StrategicPlanetId.Orion]: {
    planetId: StrategicPlanetId.Orion,
    radius: 1.45,
    assetKey: GalaxyPlanetAssetKey.AzureIce,
  },
  [StrategicPlanetId.Vega]: {
    planetId: StrategicPlanetId.Vega,
    radius: 1.27,
    assetKey: GalaxyPlanetAssetKey.RoseSpots,
  },
  [StrategicPlanetId.Selene]: {
    planetId: StrategicPlanetId.Selene,
    radius: 1.24,
    assetKey: GalaxyPlanetAssetKey.AzureIce,
  },
  [StrategicPlanetId.Hephaestus]: {
    planetId: StrategicPlanetId.Hephaestus,
    radius: 1.12,
    assetKey: GalaxyPlanetAssetKey.AmberBands,
    spaceStation: {
      kind: GalaxySpaceStationKind.OrbitalHabitat,
      interaction: GalaxySpaceStationInteraction.Placeholder,
      orbit: {
        radiusMultiplier: 2.2,
        speedRadPerSec: 0.18,
        tiltRad: Math.PI / 6,
      },
    },
  },
  [StrategicPlanetId.Athena]: {
    planetId: StrategicPlanetId.Athena,
    radius: 1.33,
    assetKey: GalaxyPlanetAssetKey.RoseSpots,
  },
  [StrategicPlanetId.Atlas]: {
    planetId: StrategicPlanetId.Atlas,
    radius: 1.48,
    assetKey: GalaxyPlanetAssetKey.GoldenRings,
    ring: { textureKey: GalaxyRingTextureKey.Prism },
  },
  [StrategicPlanetId.Eden]: {
    planetId: StrategicPlanetId.Eden,
    radius: 1.38,
    assetKey: GalaxyPlanetAssetKey.GreenGlow,
  },
  [StrategicPlanetId.Hades]: {
    planetId: StrategicPlanetId.Hades,
    radius: 1.19,
    assetKey: GalaxyPlanetAssetKey.DarkRock,
  },
  [StrategicPlanetId.Nyx]: {
    planetId: StrategicPlanetId.Nyx,
    radius: 0.98,
    assetKey: GalaxyPlanetAssetKey.VoidMatter,
  },
  [StrategicPlanetId.Helios]: {
    planetId: StrategicPlanetId.Helios,
    radius: 1.55,
    assetKey: GalaxyPlanetAssetKey.SolarFlare,
  },
};
