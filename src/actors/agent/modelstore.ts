import * as tf from '@tensorflow/tfjs';
import { EventTypes } from "@Glibs/types/globaltypes";
import IndexedDBService from '@Glibs/systems/db/indexdb'
import IEventController from '@Glibs/interface/ievent';
import { TrainingParam } from '@Glibs/types/agenttypes';

type ModelMeta = {
    id: string
    data: string
    date: number
}
const db = new IndexedDBService<ModelMeta>("ModelMgr", "modelList")
db.init()

export default class ModelStore {
    loadedFlag = false
    model?: tf.Sequential
    param?: TrainingParam

    constructor(private eventCtrl: IEventController) {}

    GetTraningData(): [tf.Sequential, TrainingParam] {
        if(!this.model || !this.param) throw new Error("undefined loadded save data");
        return [this.model, this.param]
    }

    async GetModelListElement() {
        const list = await db.getAll()
        const ol = document.createElement("ol")
        ol.classList.add("list-group", "list-group-numbered")
        list.forEach((model) => {
            const li = document.createElement("li")
            li.classList.add("list-group-item", "d-flex", "justify-content-between", "align-items-start")
            const div1 = document.createElement("div")
            div1.classList.add("ms-2", "me-auto")
            const div2 = document.createElement("div")
            div2.classList.add("fw-bold")
            div2.innerText = model.id
            div1.appendChild(div2)
            div1.insertAdjacentText("afterbegin", model.date.toString())
            const span = document.createElement("span")
            span.classList.add("badge", "bg-primary", "rounded-pill")
            li.appendChild(div1)
            li.appendChild(span)
            li.onclick = async () => {
                const m = await this.loadModelFromIndexedDB(model.id)
                this.eventCtrl.SendEventMessage(EventTypes.AgentLoad, m, model.data)
                this.eventCtrl.SendEventMessage(EventTypes.Toast, "Load Model", "Complete")
                this.loadedFlag = true
                this.param = JSON.parse(model.data)
                this.model = m as tf.Sequential
            }
            ol.appendChild(li)
        })
         const dom = document.createElement('div')
         dom.appendChild(ol)
        return dom
    }
    GetUploadElement() {
        // HTML 파일 업로드 입력 요소 추가
        const dom = document.createElement('div')
        dom.classList.add("input-group", "mb-3")
        dom.innerHTML = `<label class="input-group-text" for="modelInput">Upload</label>`

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.multiple = true;
        fileInput.id = "modelInput"
        fileInput.classList.add("form-control")

        fileInput.addEventListener('change', () => this.uploadAndLoadModel(fileInput));
        dom.appendChild(fileInput)
        return dom
    }
    async trainAndSaveModel(model: tf.Sequential, { download = false, title = "myModel", data = "" } = {}) {
        // 모델 다운로드 저장
        if (download) {
            await model.save(`downloads://${title}`);
        }
        await this.saveModelToIndexedDB(model, title, data);
    }

    async uploadAndLoadModel(fileInput: HTMLInputElement) {
        if (!fileInput.files || fileInput.files.length === 0) {
            console.error('모델 파일을 선택해주세요.');
            return;
        }

        const jsonFile = fileInput.files[0];
        const weightFiles = Array.from(fileInput.files).slice(1);

        const model = await tf.loadLayersModel(tf.io.browserFiles([jsonFile, ...weightFiles]));
        console.log('모델 로드 완료');
        model.summary();

        await this.saveModelToIndexedDB(model, fileInput.files[0].name);
    }


    async saveModelToIndexedDB(model: tf.LayersModel, title: string, data: string = "") {
        const modelPath = 'indexeddb://' + title;
        await model.save(modelPath);
        console.log(`모델이 IndexedDB에 저장되었습니다: ${modelPath}`);
        return db.add({ id: title, data, date: Date.now() })
    }

    async loadModelFromIndexedDB(title = "myModel") {
        const modelPath = 'indexeddb://' + title;
        try {
            const model = await tf.loadLayersModel(modelPath);
            console.log('IndexedDB에서 모델을 성공적으로 로드했습니다.');
            model.summary(); // 모델 구조 출력
            return model;
        } catch (error) {
            console.error('IndexedDB에서 모델을 로드할 수 없습니다:', error);
            return null;
        }
    }
}

