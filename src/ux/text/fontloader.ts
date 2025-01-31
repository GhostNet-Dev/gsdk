import { FontType } from "./fonttypes"

export default class FontLoader {
  fontCss(type: FontType) {
    switch(type) {
      case FontType.Wendy:
        this.loadCSS("https://fonts.googleapis.com/css2?family=Wendy+One&display=swap");
        break;
      case FontType.Boogaloo:
        this.loadCSS("https://fonts.googleapis.com/css2?family=Boogaloo&display=swap");
        break;
      case FontType.Galindo:
        this.loadCSS("https://fonts.googleapis.com/css2?family=Galindo&display=swap");
        break;
      case FontType.Coiny:
        this.loadCSS("https://fonts.googleapis.com/css2?family=Coiny&display=swap");
        break;

    }
  }
  loadCSS(filename: string) {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = filename;
      link.type = 'text/css';

      link.onload = () => resolve(`${filename} loaded successfully`);
      link.onerror = () => reject(new Error(`Failed to load ${filename}`));

      document.head.appendChild(link);
    });
  }
  applyDynamicStyle(styleId: string, css: string) {
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = css;
      document.head.appendChild(style); // <head>에 스타일 추가
    } else {
      console.log("Style already applied.");
    }
  }
}
