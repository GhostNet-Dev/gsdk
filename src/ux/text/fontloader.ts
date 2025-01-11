
/*
font
https://fonts.googleapis.com/css2?family=Wendy+One&display=swap
https://fonts.googleapis.com/css2?family=Boogaloo&display=swap
https://fonts.googleapis.com/css2?family=Galindo&display=swap

stylized font
https://fonts.googleapis.com/css2?family=Galindo&family=Honk:MORF@17&display=swap
.galindo-regular {
  font-family: "Galindo", serif;
  font-weight: 400;
  font-style: normal;
}
// <uniquifier>: Use a unique and descriptive class name

.honk-<uniquifier> {
  font-family: "Honk", serif;
  font-optical-sizing: auto;
  font-weight: 400;
  font-style: normal;
  font-variation-settings:
    "MORF" 17,
    "SHLN" 50;
}
*/
export default class FontLoader {
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
  addDynamicStyle(css: string): void {
    const style = document.createElement('style');
    style.type = 'text/css';
    style.textContent = css;
    document.head.appendChild(style);
  }
}
