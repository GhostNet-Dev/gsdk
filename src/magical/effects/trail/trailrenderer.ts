/**
* @author Mark Kellogg - http://www.github.com/mkkellogg
*/
import * as THREE from 'three';

//=======================================
// Trail Renderer
//=======================================

export class TrailRenderer extends THREE.Object3D {

    active = false;
    orientToMovement = false;
    geometry?: THREE.BufferGeometry;
    mesh?: THREE.Mesh
    nodeCenters: THREE.Vector3[] = []
    lastNodeCenter?: THREE.Vector3
    currentNodeCenter?: THREE.Vector3
    lastOrientationDir?: THREE.Vector3
    nodeIDs: number[] = []
    currentLength = 0;
    currentEnd = 0;
    currentNodeID = 0;
    advanceFrequency = 60;
    advancePeriod = 1 / this.advanceFrequency;
    lastAdvanceTime = 0;
    paused = false;
    pauseAdvanceUpdateTimeDiff = 0;
    constructor(private scene: THREE.Group, orientToMovement: boolean) {
        super();
        if (orientToMovement) this.orientToMovement = true;
    }

    setAdvanceFrequency(advanceFrequency: number) {
        this.advanceFrequency = advanceFrequency;
        this.advancePeriod = 1.0 / this.advanceFrequency;
    }

    length = 0
    dragTexture= 0
    targetObject?: THREE.Mesh
    material?: THREE.ShaderMaterial
    VerticesPerNode = 0
    initialize(material: THREE.ShaderMaterial, length: number, dragTexture: number, localHeadWidth: number, localHeadGeometry: THREE.Vector3[], targetObject: THREE.Mesh) {
        this.deactivate();
        this.destroyMesh();

        this.length = (length > 0) ? length + 1 : 0;
        this.dragTexture = (! dragTexture) ? 0 : 1;
        this.targetObject = targetObject;

        this.initializeLocalHeadGeometry(localHeadWidth, localHeadGeometry);

        this.nodeIDs = [];
        this.nodeCenters = [];

        for(let i = 0; i < this.length; i ++) {
            this.nodeIDs[ i ] = -1;
            this.nodeCenters[ i ] = new THREE.Vector3();
        }

        this.material = material;

        this.initializeGeometry();
        this.initializeMesh();

        this.material.uniforms.trailLength.value = 0;
        this.material.uniforms.minID.value = 0;
        this.material.uniforms.maxID.value = 0;
        this.material.uniforms.dragTexture.value = this.dragTexture;
        this.material.uniforms.maxTrailLength.value = this.length;
        this.material.uniforms.verticesPerNode.value = this.VerticesPerNode;
        this.material.uniforms.textureTileFactor.value = new THREE.Vector2(1.0, 1.0);

        this.reset();
    }

    localHeadGeometry: THREE.Vector3[] = []
    FacesPerNode = 0
    FaceIndicesPerNode = 0
    initializeLocalHeadGeometry (localHeadWidth: number, localHeadGeometry: THREE.Vector3[]) {
        this.localHeadGeometry = [];
        if (!localHeadGeometry) {
            const halfWidth = (localHeadWidth || 1.0) / 2.0;
            this.localHeadGeometry.push(new THREE.Vector3(-halfWidth, 0, 0));
            this.localHeadGeometry.push(new THREE.Vector3(halfWidth, 0, 0));
            this.VerticesPerNode = 2;
        } else {
            this.VerticesPerNode = 0;
            for (let i = 0; i < localHeadGeometry.length && i < TrailRenderer.MaxHeadVertices; i++) {
                const vertex = localHeadGeometry[ i ];
                if (vertex && vertex instanceof THREE.Vector3) {
                    const vertexCopy = new THREE.Vector3();
                    vertexCopy.copy(vertex);
                    this.localHeadGeometry.push(vertexCopy);
                    this.VerticesPerNode ++;
                }
            }
        }
        this.FacesPerNode = (this.VerticesPerNode - 1) * 2;
        this.FaceIndicesPerNode = this.FacesPerNode * 3;
    }

    vertexCount = 0
    faceCount = 0
    initializeGeometry () {
        this.vertexCount = this.length * this.VerticesPerNode;
        this.faceCount = this.length * this.FacesPerNode;

        const geometry = new THREE.BufferGeometry();

        const nodeIDs = new Float32Array(this.vertexCount);
        const nodeVertexIDs = new Float32Array(this.vertexCount * this.VerticesPerNode);
        const positions = new Float32Array(this.vertexCount * TrailRenderer.PositionComponentCount);
        const nodeCenters = new Float32Array(this.vertexCount * TrailRenderer.PositionComponentCount);
        const uvs = new Float32Array(this.vertexCount * TrailRenderer.UVComponentCount);
        const indices = new Uint32Array(this.faceCount * TrailRenderer.IndicesPerFace);

        const nodeIDAttribute = new THREE.BufferAttribute(nodeIDs, 1);
        nodeIDAttribute.needsUpdate = true;
        geometry.setAttribute('nodeID', nodeIDAttribute);

        const nodeVertexIDAttribute = new THREE.BufferAttribute(nodeVertexIDs, 1);
        nodeVertexIDAttribute.needsUpdate = true;
        geometry.setAttribute('nodeVertexID', nodeVertexIDAttribute);

        const nodeCenterAttribute = new THREE.BufferAttribute(nodeCenters, TrailRenderer.PositionComponentCount);
        nodeCenterAttribute.needsUpdate = true;
        geometry.setAttribute('nodeCenter', nodeCenterAttribute);

        const positionAttribute = new THREE.BufferAttribute(positions, TrailRenderer.PositionComponentCount);
        positionAttribute.needsUpdate = true;
        geometry.setAttribute('position', positionAttribute);

        const uvAttribute = new THREE.BufferAttribute(uvs, TrailRenderer.UVComponentCount);
        uvAttribute.needsUpdate = true;
        geometry.setAttribute('uv', uvAttribute);

        const indexAttribute = new THREE.BufferAttribute(indices, 1);
        indexAttribute.needsUpdate = true;
        geometry.setIndex(indexAttribute);

        this.geometry = geometry;
    }

    zeroVertices () {
        if(!this.geometry) throw new Error("undefined");
        
        const positions = this.geometry.getAttribute('position');
        for (let i = 0; i < this.vertexCount; i ++) {
            const index = i * 3;
            positions.array[ index ] = 0;
            positions.array[ index + 1 ] = 0;
            positions.array[ index + 2 ] = 0;
        }
        positions.needsUpdate = true;
    }

    zeroIndices () {
        const indices = this.geometry?.getIndex();
        if(!indices)throw new Error("undefined");
        for (let i = 0; i < this.faceCount; i ++) {
            const index = i * 3;
            indices.array[ index ] = 0;
            indices.array[ index + 1 ] = 0;
            indices.array[ index + 2 ] = 0;
        }
        indices.needsUpdate = true;
    }

    formInitialFaces () {
        this.zeroIndices();
        const indices = this.geometry?.getIndex();
        if(!indices)throw new Error("undefined");
        for (let i = 0; i < this.length - 1; i ++) {
            this.connectNodes(i, i + 1);
        }
        indices.needsUpdate = true;
        indices.updateRange.count = - 1;
    }

    initializeMesh () {
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        //this.mesh.dynamic = true;
        this.mesh.matrixAutoUpdate = false;
    }

    destroyMesh () {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh = undefined;
        }
    }

    reset () {
        this.currentLength = 0;
        this.currentEnd = -1;
        this.lastNodeCenter = undefined
        this.currentNodeCenter = undefined
        this.lastOrientationDir = undefined;
        this.currentNodeID = 0;
        this.formInitialFaces();
        this.zeroVertices();
        this.geometry?.setDrawRange(0, 0);
    }

    updateUniforms () {
        if(!this.material) throw new Error("undefined");
        
        if (this.currentLength < this.length) {
            this.material.uniforms.minID.value = 0;
        } else {
            this.material.uniforms.minID.value = this.currentNodeID - this.length;
        }
        this.material.uniforms.maxID.value = this.currentNodeID;
        this.material.uniforms.trailLength.value = this.currentLength;
        this.material.uniforms.maxTrailLength.value = this.length;
        this.material.uniforms.verticesPerNode.value = this.VerticesPerNode;
    }

    advance() {
        if(!this.targetObject) throw new Error("undefined");
        
        const tempMatrix4 = new THREE.Matrix4();
        this.targetObject.updateMatrixWorld();
        tempMatrix4.copy(this.targetObject.matrixWorld);
        this.advanceWithTransform(tempMatrix4);
        this.updateUniforms();
    }

    advanceWithPositionAndOrientation (nextPosition: THREE.Vector3, orientationTangent: any) {
        this.advanceGeometry({ position : nextPosition, tangent : orientationTangent }, null);
    }

    advanceWithTransform (transformMatrix: THREE.Matrix4) {
        this.advanceGeometry(null, transformMatrix);
    }

    advanceGeometry(positionAndOrientation: any, transformMatrix: THREE.Matrix4 | null) {
        const nextIndex = this.currentEnd + 1 >= this.length ? 0 : this.currentEnd + 1;
        if (transformMatrix) {
            this.updateNodePositionsFromTransformMatrix(nextIndex, transformMatrix);
        } else {
            this.updateNodePositionsFromOrientationTangent(nextIndex, positionAndOrientation.position, positionAndOrientation.tangent);
        }

        if (this.currentLength >= 1) {
            this.connectNodes(this.currentEnd, nextIndex);
            if (this.currentLength >= this.length) {
                const disconnectIndex = this.currentEnd + 1 >= this.length ? 0 : this.currentEnd + 1;
                this.disconnectNodes(disconnectIndex);
            }
        }

        if (this.currentLength < this.length) {
            this.currentLength++;
        }

        this.currentEnd++;
        if (this.currentEnd >= this.length) {
            this.currentEnd = 0;
        }

        if (this.currentLength >= 1) {
            if (this.currentLength < this.length) {
                this.geometry?.setDrawRange(0, (this.currentLength - 1) * this.FaceIndicesPerNode);
            } else {
                this.geometry?.setDrawRange(0, this.currentLength * this.FaceIndicesPerNode);
            }
        }
        this.updateNodeID(this.currentEnd, this.currentNodeID);
        this.currentNodeID++;
    }

    currentTime() {
        return performance.now() / 1000;
    }

    pause() {
        if (!this.paused) {
            this.paused = true;
            this.pauseAdvanceUpdateTimeDiff = this.currentTime() - this.lastAdvanceTime;
        }
    }

    resume() {
        if(this.paused) {
            this.paused = false;
            this.lastAdvanceTime = this.currentTime() - this.pauseAdvanceUpdateTimeDiff;
        }
    }

    update() {
        if (!this.paused) {
            const time = this.currentTime();
            if (!this.lastAdvanceTime) this.lastAdvanceTime = time;
            if (time - this.lastAdvanceTime > this.advancePeriod) {
                this.advance();
                this.lastAdvanceTime = time;
            } else {
                this.updateHead();
            }
        }
    }

    updateHead() {
        if (!this.targetObject) throw new Error("undefined");

        const tempMatrix4 = new THREE.Matrix4();
        if (this.currentEnd < 0) return;
        this.targetObject.updateMatrixWorld();
        tempMatrix4.copy(this.targetObject.matrixWorld);
        this.updateNodePositionsFromTransformMatrix(this.currentEnd, tempMatrix4);
    };


    updateNodeID (nodeIndex: number, id: number) { 
        if(!this.geometry) throw new Error("undefined");
        
        this.nodeIDs[ nodeIndex ] = id;
        const nodeIDs = this.geometry.getAttribute('nodeID');
        const nodeVertexIDs = this.geometry.getAttribute('nodeVertexID');
        for (let i = 0; i < this.VerticesPerNode; i ++) {
            const baseIndex = nodeIndex * this.VerticesPerNode + i ;
            nodeIDs.array[ baseIndex ] = id;
            nodeVertexIDs.array[ baseIndex ] = i;
        }    
        nodeIDs.needsUpdate = true;
        nodeVertexIDs.needsUpdate = true;
    }

    updateNodeCenter (nodeIndex: number, nodeCenter: THREE.Vector3) { 
        if(!this.geometry) throw new Error("undefined");

        this.lastNodeCenter = this.currentNodeCenter;
        this.currentNodeCenter = this.nodeCenters[ nodeIndex ];
        this.currentNodeCenter.copy(nodeCenter);
        const nodeCenters = this.geometry.getAttribute('nodeCenter');
        for (let i = 0; i < this.VerticesPerNode; i ++) {
            const baseIndex = (nodeIndex * this.VerticesPerNode + i) * 3;
            nodeCenters.array[ baseIndex ] = nodeCenter.x;
            nodeCenters.array[ baseIndex + 1 ] = nodeCenter.y;
            nodeCenters.array[ baseIndex + 2 ] = nodeCenter.z;
        }    
        nodeCenters.needsUpdate = true;
    }

    updateNodePositionsFromOrientationTangent = (nodeIndex: number, nodeCenter: THREE.Vector3 | null, orientationTangent: THREE.Vector3 | null) => { 

        const tempQuaternion = new THREE.Quaternion();
        const tempOffset = new THREE.Vector3();
        const tempLocalHeadGeometry: THREE.Vector3[] = [];
        for (let i = 0; i < TrailRenderer.MaxHeadVertices; i ++) {
            const vertex = new THREE.Vector3();
            tempLocalHeadGeometry.push(vertex);
        }

        return (nodeIndex: number, nodeCenter: THREE.Vector3, orientationTangent: THREE.Vector3 ) => {
            if(!this.geometry) throw new Error("undefined");
            
            const positions = this.geometry.getAttribute('position');
            this.updateNodeCenter(nodeIndex, nodeCenter);
            tempOffset.copy(nodeCenter);
            tempOffset.sub(TrailRenderer.LocalHeadOrigin);
            tempQuaternion.setFromUnitVectors(TrailRenderer.LocalOrientationTangent, orientationTangent);

            for (let i = 0; i < this.localHeadGeometry.length; i ++) {
                const vertex = tempLocalHeadGeometry[ i ];
                vertex.copy(this.localHeadGeometry[ i ]);
                vertex.applyQuaternion(tempQuaternion);
                vertex.add(tempOffset);
            }

            for (let i = 0; i <  this.localHeadGeometry.length; i ++) {
                const positionIndex = ((this.VerticesPerNode * nodeIndex) + i) * TrailRenderer.PositionComponentCount;
                const transformedHeadVertex = tempLocalHeadGeometry[ i ];
                positions.array[ positionIndex ] = transformedHeadVertex.x;
                positions.array[ positionIndex + 1 ] = transformedHeadVertex.y;
                positions.array[ positionIndex + 2 ] = transformedHeadVertex.z;
            }

            positions.needsUpdate = true;
        };

    }

    updateNodePositionsFromTransformMatrix = (nodeIndex: number, transformMatrix: THREE.Matrix4) => { 
        const tempMatrix3 = new THREE.Matrix3();
        const tempQuaternion = new THREE.Quaternion();
        const tempPosition = new THREE.Vector3();
        const tempOffset = new THREE.Vector3();
        const worldOrientation = new THREE.Vector3();
        const tempDirection = new THREE.Vector3();

        const tempLocalHeadGeometry: THREE.Vector3[] = [];
        for (let i = 0; i < TrailRenderer.MaxHeadVertices; i ++) {
            const vertex = new THREE.Vector3();
            tempLocalHeadGeometry.push(vertex);
        }

        function getMatrix3FromMatrix4(matrix3: THREE.Matrix3, matrix4: THREE.Matrix4) {
            const e = matrix4.elements;
            matrix3.set(e[0], e[1], e[2],
                        e[4], e[5], e[6],
                        e[8], e[9], e[10]);

        }

        return (nodeIndex: number, transformMatrix: THREE.Matrix4) => {
            if (!this.geometry) throw new Error("undefined");
            
            const positions = this.geometry.getAttribute('position');
            tempPosition.set(0, 0, 0);
            tempPosition.applyMatrix4(transformMatrix);
            this.updateNodeCenter(nodeIndex, tempPosition);
            for (let i = 0; i < this.localHeadGeometry.length; i ++) {
                const vertex = tempLocalHeadGeometry[ i ];
                vertex.copy(this.localHeadGeometry[ i ]);
            }

            for (let i = 0; i < this.localHeadGeometry.length; i ++) {
                const vertex = tempLocalHeadGeometry[ i ];
                vertex.applyMatrix4(transformMatrix);
            }
            
            if(this.lastNodeCenter && this.orientToMovement && this.currentNodeCenter) {
                getMatrix3FromMatrix4(tempMatrix3, transformMatrix);
                worldOrientation.set(0, 0, -1);
                worldOrientation.applyMatrix3(tempMatrix3);
                tempDirection.copy(this.currentNodeCenter);
                tempDirection.sub(this.lastNodeCenter);
                tempDirection.normalize();

                if(tempDirection.lengthSq() <= .0001 && this.lastOrientationDir) {
                    tempDirection.copy(this.lastOrientationDir);
                }

                if(tempDirection.lengthSq() > .0001) {
                    if(! this.lastOrientationDir) this.lastOrientationDir = new THREE.Vector3();
                    tempQuaternion.setFromUnitVectors(worldOrientation, tempDirection);
                    tempOffset.copy(this.currentNodeCenter);
                    for (let i = 0; i < this.localHeadGeometry.length; i ++) {
                        const vertex = tempLocalHeadGeometry[ i ];
                        vertex.sub(tempOffset);
                        vertex.applyQuaternion(tempQuaternion);
                        vertex.add(tempOffset);
                    }
                }
            }

            for (let i = 0; i < this.localHeadGeometry.length; i ++) {
                const positionIndex = ((this.VerticesPerNode * nodeIndex) + i) * TrailRenderer.PositionComponentCount;
                const transformedHeadVertex = tempLocalHeadGeometry[ i ];
                positions.array[ positionIndex ] = transformedHeadVertex.x;
                positions.array[ positionIndex + 1 ] = transformedHeadVertex.y;
                positions.array[ positionIndex + 2 ] = transformedHeadVertex.z;
            }
            positions.needsUpdate = true;
            //positions.updateRange.offset = nodeIndex * this.VerticesPerNode * TrailRenderer.PositionComponentCount; 
            //positions.updateRange.count = this.VerticesPerNode * TrailRenderer.PositionComponentCount; 
        };

    }

    connectNodes = (srcNodeIndex: number, destNodeIndex: number) => {

        const returnObj = {
            "attribute" : {},
            "offset" : 0,
            "count" : - 1
        };

        return (srcNodeIndex: number, destNodeIndex: number) => {
            if(!this.geometry) throw new Error("undefined");
            
            const indices = this.geometry.getIndex();
            if(!indices) throw new Error("undefined");
            for (let i = 0; i < this.localHeadGeometry.length - 1; i ++) {
                const srcVertexIndex = (this.VerticesPerNode * srcNodeIndex) + i;
                const destVertexIndex = (this.VerticesPerNode * destNodeIndex) + i;
                const faceIndex = ((srcNodeIndex * this.FacesPerNode) + (i * TrailRenderer.FacesPerQuad )) * TrailRenderer.IndicesPerFace;
                indices.array[ faceIndex ] = srcVertexIndex;
                indices.array[ faceIndex + 1 ] = destVertexIndex;
                indices.array[ faceIndex + 2 ] = srcVertexIndex + 1;
                indices.array[ faceIndex + 3 ] = destVertexIndex;
                indices.array[ faceIndex + 4 ] = destVertexIndex + 1;
                indices.array[ faceIndex + 5 ] = srcVertexIndex + 1;
            }
            indices.needsUpdate = true;
            returnObj.attribute = indices;
            returnObj.offset =  srcNodeIndex * this.FacesPerNode * TrailRenderer.IndicesPerFace;
            returnObj.count = this.FacesPerNode * TrailRenderer.IndicesPerFace;
            return returnObj;

        };

    }

    disconnectNodes = (srcNodeIndex: number) => {

        const returnObj = {
            "attribute" : {},
            "offset" : 0,
            "count" : - 1
        };

        return (srcNodeIndex: number) => {
            if(!this.geometry) throw new Error("undefined");

            const indices = this.geometry.getIndex();
            if(!indices) throw new Error("undefined");
            for (let i = 0; i < this.localHeadGeometry.length - 1; i ++) {
                const faceIndex = ((srcNodeIndex * this.FacesPerNode) + (i * TrailRenderer.FacesPerQuad)) * TrailRenderer.IndicesPerFace;
                indices.array[ faceIndex ] = 0;
                indices.array[ faceIndex + 1 ] = 0;
                indices.array[ faceIndex + 2 ] = 0;
                indices.array[ faceIndex + 3 ] = 0;
                indices.array[ faceIndex + 4 ] = 0;
                indices.array[ faceIndex + 5 ] = 0;
            }
            indices.needsUpdate = true;
            //indices.updateRange.count = - 1;
            returnObj.attribute = indices;
            returnObj.offset = srcNodeIndex * this.FacesPerNode * TrailRenderer.IndicesPerFace;
            returnObj.count = this.FacesPerNode * TrailRenderer.IndicesPerFace;
            return returnObj;
        };

    }

    isActive = false
    deactivate () {
        if (this.isActive && this.mesh) {
            this.scene.remove(this.mesh);
            this.isActive = false;
        }
    }

    activate () {
        if (! this.isActive && this.mesh) {
            this.scene.add(this.mesh);
            this.isActive = true;
        }
    }

    static createMaterial(vertexShader: string, fragmentShader: string, customUniforms: any) {

        customUniforms = customUniforms || {};
        customUniforms.trailLength = { type: "f", value: null };
        customUniforms.verticesPerNode = { type: "f", value: null };
        customUniforms.minID = { type: "f", value: null };
        customUniforms.maxID = { type: "f", value: null };
        customUniforms.dragTexture = { type: "f", value: null };
        customUniforms.maxTrailLength = { type: "f", value: null };
        customUniforms.textureTileFactor = { type: "v2", value: null };
        customUniforms.headColor = { type: "v4", value: new THREE.Vector4() };
        customUniforms.tailColor = { type: "v4", value: new THREE.Vector4() };

        vertexShader = vertexShader || TrailRenderer.Shader.BaseVertexShader;
        fragmentShader = fragmentShader || TrailRenderer.Shader.BaseFragmentShader;

        return new THREE.ShaderMaterial({
            uniforms: customUniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            transparent: true,
            alphaTest: 0.5,
            blending : THREE.CustomBlending,
            blendSrc : THREE.SrcAlphaFactor,
            blendDst : THREE.OneMinusSrcAlphaFactor,
            blendEquation : THREE.AddEquation,
            depthTest: true,
            depthWrite: false,
            side: THREE.DoubleSide
        });
    
    }
    
    static createBaseMaterial(customUniforms: any) {
        return TrailRenderer.createMaterial(TrailRenderer.Shader.BaseVertexShader, TrailRenderer.Shader.BaseFragmentShader, customUniforms);
    }

    static createTexturedMaterial (customUniforms: any) {
        customUniforms = {};
        customUniforms.trailTexture = { type: "t", value: null };
        return TrailRenderer.createMaterial(TrailRenderer.Shader.TexturedVertexShader, TrailRenderer.Shader.TexturedFragmentShader, customUniforms);
    }

    static get MaxHeadVertices () {
        return 128;
    }

    static _LocalOrientationTangent = new THREE.Vector3(1, 0, 0);
    static get LocalOrientationTangent () {
        return this._LocalOrientationTangent;
    }

    static _LocalHeadOrigin = new THREE.Vector3(0, 0, 0);
    static get LocalHeadOrigin () {
        return this._LocalHeadOrigin;
    }

    static get PositionComponentCount () {
        return 3;
    }

    static get UVComponentCount () {
        return 2;
    }

    static get IndicesPerFace () {
        return 3;
    }

    static get FacesPerQuad () {
        return 2;
    }

    static Shader = {

        get BaseVertexVars() {
            return [
                "attribute float nodeID;",
                "attribute float nodeVertexID;",
                "attribute vec3 nodeCenter;",
                "uniform float minID;",
                "uniform float maxID;",
                "uniform float trailLength;",
                "uniform float maxTrailLength;",
                "uniform float verticesPerNode;",
                "uniform vec2 textureTileFactor;",
                "uniform vec4 headColor;",
                "uniform vec4 tailColor;",
                "varying vec4 vColor;",
            ].join("\n")
        },

        get TexturedVertexVars() {
            return [
                this.BaseVertexVars, 
                "varying vec2 vUV;",
                "uniform float dragTexture;",
            ].join("\n");
        },

        BaseFragmentVars: [
            "varying vec4 vColor;",
            "uniform sampler2D trailTexture;",
        ].join("\n"),

        get TexturedFragmentVars() {
            return [
                this.BaseFragmentVars,
                "varying vec2 vUV;"
            ].join("\n");
        },

        get VertexShaderCore() {
            return [
                "float fraction = (maxID - nodeID) / (maxID - minID);",
                "vColor = (1.0 - fraction) * headColor + fraction * tailColor;",
                "vec4 realPosition = vec4((1.0 - fraction) * position.xyz + fraction * nodeCenter.xyz, 1.0); ", 
            ].join("\n");
        },

        get BaseVertexShader() {
            return [
                this.BaseVertexVars,
                "void main() { ",
                    this.VertexShaderCore,
                    "gl_Position = projectionMatrix * viewMatrix * realPosition;",
                "}"
            ].join("\n");
        },

        get BaseFragmentShader() {
            return [
                this.BaseFragmentVars,
                "void main() { ",
                    "gl_FragColor = vColor;",
                "}"
            ].join("\n");
        },

        get TexturedVertexShader() {
            return [
                this.TexturedVertexVars,
                "void main() { ",
                    this.VertexShaderCore,
                    "float s = 0.0;",
                    "float t = 0.0;",
                    "if (dragTexture == 1.0) { ",
                    "   s = fraction *  textureTileFactor.s; ",
                    "     t = (nodeVertexID / verticesPerNode) * textureTileFactor.t;",
                    "} else { ",
                    "    s = nodeID / maxTrailLength * textureTileFactor.s;",
                    "     t = (nodeVertexID / verticesPerNode) * textureTileFactor.t;",
                    "}",
                    "vUV = vec2(s, t); ",
                    "gl_Position = projectionMatrix * viewMatrix * realPosition;",
                "}"
            ].join("\n");
        },

        get TexturedFragmentShader() {
            return [
                this.TexturedFragmentVars,
                "void main() { ",
                    "vec4 textureColor = texture2D(trailTexture, vUV);",
                    "gl_FragColor = vColor * textureColor;",
                "}"
            ].join("\n");
        }
    };
}
