

export default class Confetti {
    el: HTMLElement
    confettiFrequency = 3;
    containerEl?: HTMLElement
    confettiColors = ['#fce18a', '#ff726d', '#b48def', '#f4306d'];
    confettiAnimations = ['slow', 'medium', 'fast'];
    confettiInterval?: NodeJS.Timeout

    constructor({ index = 0 } = {}) {
        this.applyDynamicStyle("confetti", getCSS(index))

        this.el = document.createElement("div");
        this.el.classList.add("js-container", "_container")
        document.body.appendChild(this.el)

        this._setupElements();
        this._renderConfetti();
    }
    despose() {
        clearInterval(this.confettiInterval)
    }

    _setupElements() {
        const containerEl = document.createElement('div');
        this.el.style.position = 'absolute';

        containerEl.classList.add('confetti-container');

        this.el.appendChild(containerEl);

        this.containerEl = containerEl;
    };
    _renderConfetti() {
        this.confettiInterval = setInterval(() => {
            const confettiEl = document.createElement('div');
            const confettiSize = (Math.floor(Math.random() * 3) + 7) + 'px';
            const confettiBackground = this.confettiColors[Math.floor(Math.random() * this.confettiColors.length)];
            const confettiLeft = (Math.floor(Math.random() * this.el.offsetWidth)) + 'px';
            const confettiAnimation = this.confettiAnimations[Math.floor(Math.random() * this.confettiAnimations.length)];

            confettiEl.classList.add('confetti', 'confetti--animation-' + confettiAnimation);
            confettiEl.style.left = confettiLeft;
            confettiEl.style.width = confettiSize;
            confettiEl.style.height = confettiSize;
            confettiEl.style.backgroundColor = confettiBackground;

            setTimeout( () => {
                confettiEl.parentNode?.removeChild(confettiEl);
                confettiEl.remove()
            }, 3000);

            this.containerEl?.appendChild(confettiEl);
        }, 25);
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

function getCSS(index: number) {
    return `
    @keyframes confetti-slow {
        0% { transform: translate3d(0, 0, 0) rotateX(0) rotateY(0); }

        100% { transform: translate3d(25px, 105vh, 0) rotateX(360deg) rotateY(180deg); }
    }

    @keyframes confetti-medium {
        0% { transform: translate3d(0, 0, 0) rotateX(0) rotateY(0); }

        100% { transform: translate3d(100px, 105vh, 0) rotateX(100deg) rotateY(360deg); }
    }

    @keyframes confetti-fast {
        0% { transform: translate3d(0, 0, 0) rotateX(0) rotateY(0); }

        100% { transform: translate3d(-50px, 105vh, 0) rotateX(10deg) rotateY(250deg); }
    }

    ._container {
        width: 100%;
        height: 100vh;
    }

    .confetti-container {
        perspective: 700px;
        position: absolute;
        overflow: hidden;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
    }
    .confetti--animation-slow {
        position: absolute;
        top: -10px;
        border-radius: 0%;
        animation: confetti-slow 2.25s linear 1 forwards;
        ${index > 0 ? `z-index:${index};` : ""}
    }
    .confetti--animation-medium {
        position: absolute;
        top: -10px;
        border-radius: 0%;
        animation: confetti-medium 1.75s linear 1 forwards;
        ${index > 0 ? `z-index:${index};` : ""}
    }
    .confetti--animation-fast {
        position: absolute;
        top: -10px;
        border-radius: 0%;
        animation: confetti-fast 1.25s linear 1 forwards;
        ${index > 0 ? `z-index:${index};` : ""}
    }
    `
}



