import * as THREE from "three";
import { KeyType } from "./eventtypes";
import { IKeyCommand } from "./ievent";

export class KeyNone implements IKeyCommand {
    get Type() { return KeyType.None }
    ExecuteKeyUp(): THREE.Vector3 {
        return new THREE.Vector3(0, 0, 0)
    }

    ExecuteKeyDown(): THREE.Vector3 {
        return new THREE.Vector3(0, 0, 0)
    }
}
export class KeyAction1 implements IKeyCommand{
    get Type() { return KeyType.Action1 }
    ExecuteKeyUp(): THREE.Vector3 {
        return new THREE.Vector3(0, 0, 0)
    }

    ExecuteKeyDown(): THREE.Vector3 {
        return new THREE.Vector3(0, 0, 0)
    }
}
export class KeyAction2 implements IKeyCommand{
    get Type() { return KeyType.Action2 }
    ExecuteKeyUp(): THREE.Vector3 {
        return new THREE.Vector3(0, 0, 0)
    }

    ExecuteKeyDown(): THREE.Vector3 {
        return new THREE.Vector3(0, 0, 0)
    }
}
export class KeyAction3 implements IKeyCommand{
    get Type() { return KeyType.Action3 }
    ExecuteKeyUp(): THREE.Vector3 {
        return new THREE.Vector3(0, 0, 0)
    }

    ExecuteKeyDown(): THREE.Vector3 {
        return new THREE.Vector3(0, 0, 0)
    }
}
export class KeyAction4 implements IKeyCommand{
    get Type() { return KeyType.Action4 }
    ExecuteKeyUp(): THREE.Vector3 {
        return new THREE.Vector3(0, 0, 0)
    }

    ExecuteKeyDown(): THREE.Vector3 {
        return new THREE.Vector3(0, 0, 0)
    }
}
export class KeyAction5 implements IKeyCommand{
    get Type() { return KeyType.Action5 }
    ExecuteKeyUp(): THREE.Vector3 {
        return new THREE.Vector3(0, 0, 0)
    }

    ExecuteKeyDown(): THREE.Vector3 {
        return new THREE.Vector3(0, 0, 0)
    }
}
export class KeySpace implements IKeyCommand{
    get Type() { return KeyType.Action0 }
    ExecuteKeyUp(): THREE.Vector3 {
        return new THREE.Vector3(0, 7, 0)
    }

    ExecuteKeyDown(): THREE.Vector3 {
        return new THREE.Vector3(0, 7, 0)
    }
}
export class KeyUp implements IKeyCommand{
    get Type() { return KeyType.Up }
    ExecuteKeyUp(): THREE.Vector3 {
        return new THREE.Vector3(0, 0, -1)
    }

    ExecuteKeyDown(): THREE.Vector3 {
        return new THREE.Vector3(0, 0, -1)
    }
}

export class KeyDown implements IKeyCommand{
    get Type() { return KeyType.Down }
    ExecuteKeyUp(): THREE.Vector3 {
        return new THREE.Vector3(0, 0, 1)
    }

    ExecuteKeyDown(): THREE.Vector3 {
        return new THREE.Vector3(0, 0, 1)
    }
}
export class KeyLeft implements IKeyCommand{
    get Type() { return KeyType.Left }
    ExecuteKeyUp(): THREE.Vector3 {
        return new THREE.Vector3(-1, 0, 0)
    }

    ExecuteKeyDown(): THREE.Vector3 {
        return new THREE.Vector3(-1, 0, 0)
    }
}
export class KeyRight implements IKeyCommand{
    get Type() { return KeyType.Right }
    ExecuteKeyUp(): THREE.Vector3 {
        return new THREE.Vector3(1, 0, 0)
    }

    ExecuteKeyDown(): THREE.Vector3 {
        return new THREE.Vector3(1, 0, 0)
    }
}
export class KeySystem0 implements IKeyCommand{
    get Type() { return KeyType.System0 }
    ExecuteKeyUp(): THREE.Vector3 {
        return new THREE.Vector3()
    }

    ExecuteKeyDown(): THREE.Vector3 {
        return new THREE.Vector3()
    }
}