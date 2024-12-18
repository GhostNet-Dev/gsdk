import { JoystickManager } from "./joystic";

export class Joypad {
	joy = document.createElement("canvas")
	ctx = this.joy.getContext("2d");
	joyPos = this.joy.getBoundingClientRect();

	startX = 0
	startY = 0
	moveX = 0
	moveY = 0
	onTouch = false

	moveMax = 40;
	msgPrev = "s";
	msg = "s";
	color = "rgb(255, 255, 255)"

	constructor(private options: JoystickManager) {
        this.joy.setAttribute("id", "zone_joypad")
        //this.joy.setAttribute("class", "zone_joystick")
		document.body.appendChild(this.joy)

		this.joy.width = 100;
		this.joy.height = 100;

		this.joy.ontouchstart = (e) => {
			this.start()
            if (this.options.ontouchstart) {
                this.options.ontouchstart(e)
			}
		}
		this.joy.ontouchmove = (e) => {
			if (this.onTouch && this.options.ontouchmove) {
                this.options.ontouchmove(e)
			}
		}
		this.joy.ontouchend = (e) => {
			this.end()
			if (this.options.ontouchend) {
                this.options.ontouchend(e)
            }
		}
		this.joy.onmousedown = () => {
			this.start()
		}
		this.joy.onmouseup = () => {
			this.end()
		}
		if (this.ctx == undefined) return
		this.ctx.lineWidth = 10;
		this.ctx.globalAlpha = 0.5

		this.clearBackground();
        this.drawCircle(this.joy.width / 2, this.joy.height / 2, this.joy.width / 2, this.color);
	}
	Hide() {
		this.joy.style.display = "none"
	}
	Show() {
		this.joy.style.display = "block"
	}
	send(msg: string) {
		console.log(msg);
	}

	clearBackground() {
		if (this.ctx == undefined) return
		this.ctx.clearRect(0, 0, this.joy.width, this.joy.height);
	}

	drawCircle(x: number, y: number, r: number, c: string) {
		if (this.ctx == undefined) return
		this.ctx.beginPath();
		this.ctx.fillStyle = c;
		this.ctx.arc(x, y, r, 0, 2 * Math.PI);
		this.ctx.fill();
	}

	start() {
		this.onTouch = true;
		this.options.event("move", this.msg, this.moveX, this.moveY)
	}
	end() {
		this.msg = "s";
		this.msgPrev = "s";
		this.onTouch = false;
		this.send(this.msg);
		this.options.event("end", this.msg, this.moveX, this.moveY)
	}
}