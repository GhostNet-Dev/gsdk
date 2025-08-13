import { FontType } from "./fonttypes"

export default class FontLoader {
  fontCss(type: FontType) {
    let font = "Fredoka"
    switch(type) {
      case FontType.Wendy:
        this.loadCSS("https://fonts.googleapis.com/css2?family=Wendy+One&display=swap");
        font = "Wendy One"
        break;
      case FontType.Boogaloo:
        this.loadCSS("https://fonts.googleapis.com/css2?family=Boogaloo&display=swap");
        font = "Boogaloo"
        break;
      case FontType.Galindo:
        this.loadCSS("https://fonts.googleapis.com/css2?family=Galindo&display=swap");
        font = "Galindo"
        break;
      case FontType.Coiny:
        this.loadCSS("https://fonts.googleapis.com/css2?family=Coiny&display=swap");
        font = "Coiny"
        break;;;
      case FontType.NotoSansKr:
        this.loadCSS("https://fonts.googleapis.com/css2?family=Noto+Sans+KR&display=swap");
        font = "Noto Sans KR"
        break;
      case FontType.Fredoka:
        this.loadCSS("https://fonts.googleapis.com/css2?family=Fredoka:wght@600&display=swap");
        font = "Fredoka"
        break;

    }
    this.applyDynamicStyle("gsdkfont", `
    .gfont {
      font-family: "${font}"
    }
    .gametext {
        white-space: nowrap;
        caret-color: transparent;
        color:#fff;
        text-shadow: -1px 0px black, 0px 1px black, 1px 0px black, 0px -1px black;
    }
    `)
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
    const st = document.getElementById(styleId)
    if (!st) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = css;
      document.head.appendChild(style); // <head>에 스타일 추가
    } else {
      st.textContent = css;
      console.log("Style already applied.");
    }
  }
}
