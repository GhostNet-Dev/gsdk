import { StrategicPlanetId } from "@Glibs/gameobjects/strategicgalaxy/strategicgalaxytypes";

export interface CitySceneSelection {
  planetId: StrategicPlanetId;
  cityId: string;
}

class CitySceneSessionStoreImpl { 
  private selection?: CitySceneSelection;

  setSelection(selection: CitySceneSelection): void {
    this.selection = { ...selection };
  }

  getSelection(): CitySceneSelection | undefined {
    return this.selection ? { ...this.selection } : undefined;
  }

  clearSelection(): void {
    this.selection = undefined;
  }
}

export const CitySceneSessionStore = new CitySceneSessionStoreImpl();
