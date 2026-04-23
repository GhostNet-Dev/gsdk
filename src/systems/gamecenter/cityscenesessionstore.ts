import { StrategicPlanetId } from "@Glibs/gameobjects/strategicgalaxy/strategicgalaxytypes";

export interface CitySceneSelection {
  planetId: StrategicPlanetId;
  cityId: string;
}

export interface GalaxyReturnFocus {
  planetId: StrategicPlanetId;
  cityId?: string;
}

class CitySceneSessionStoreImpl { 
  private selection?: CitySceneSelection;
  private galaxyReturnFocus?: GalaxyReturnFocus;

  setSelection(selection: CitySceneSelection): void {
    this.selection = { ...selection };
  }

  getSelection(): CitySceneSelection | undefined {
    return this.selection ? { ...this.selection } : undefined;
  }

  clearSelection(): void {
    this.selection = undefined;
  }

  setGalaxyReturnFocus(focus: GalaxyReturnFocus): void {
    this.galaxyReturnFocus = { ...focus };
  }

  consumeGalaxyReturnFocus(): GalaxyReturnFocus | undefined {
    const focus = this.galaxyReturnFocus ? { ...this.galaxyReturnFocus } : undefined;
    this.clearGalaxyReturnFocus();
    return focus;
  }

  clearGalaxyReturnFocus(): void {
    this.galaxyReturnFocus = undefined;
  }
}

export const CitySceneSessionStore = new CitySceneSessionStoreImpl();
