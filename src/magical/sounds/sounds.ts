import IEventController from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";
import * as THREE from "three";
import { SoundType } from "./soundtypes";



export default class Sounds {
    private processFlag = false
    private audioLoader = new THREE.AudioLoader()
    private sounds = new Map<SoundType, THREE.PositionalAudio[]>()
    obj = new THREE.Group()

    get Mesh() { return this.obj }

    constructor(
        listener: THREE.AudioListener,
        eventCtrl: IEventController,
        domain = "https://hons.ghostwebservice.com/"
    ) {
        eventCtrl.RegisterEventListener(EventTypes.RegisterSound, (target: THREE.Object3D, audioPath: SoundType) => {
            const sound = new THREE.PositionalAudio(listener)
            if(this.sounds.has(audioPath)) {
                target.add(this.sounds.get(audioPath)![0])
                return
            }
            this.audioLoader.load(domain + audioPath, (buffer) => {
                sound.setBuffer(buffer)
                sound.setRefDistance(20)
                target.add(sound)
                const pool = this.sounds.get(audioPath)
                if (!pool) {
                    this.sounds.set(audioPath, [sound])
                } else {
                    pool.push(sound)
                }
            })
        })
        eventCtrl.RegisterEventListener(EventTypes.PlaySound, (target: THREE.Object3D, audioPath: SoundType) => {
            this.Start(target, audioPath)
        })  
    }

    Start(target: THREE.Object3D, type: SoundType) {
        this.processFlag = true
        const pool = this.sounds.get(type)
        if (!pool) return 
        for(const sound of pool) {
            if(sound.isPlaying) continue
            sound.play()
            return
        }
        // Play
        const sound = this.cloneAudio(pool[0])
        target.add(sound)
        pool.push(sound)
        sound.play()
    }
    cloneAudio(source: THREE.PositionalAudio): THREE.PositionalAudio {
        const clone = new THREE.PositionalAudio(source.listener);
        clone.setBuffer(source.buffer!);
        clone.setLoop(source.loop);
        clone.setRefDistance(source.getRefDistance());
        clone.setVolume(source.getVolume());
        clone.setPlaybackRate(source.playbackRate);
        return clone;
    }
    Complete(): void {
        
    }
    Update(_: number) {
        if (!this.processFlag) return
    }
}