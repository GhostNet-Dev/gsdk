import * as tf from '@tensorflow/tfjs';
import IndexedDBService from '@Glibs/systems/db/indexdb'

type ModelMeta = {
    title: string
    date: number
}
const db = new IndexedDBService<ModelMeta>("ModelMgr", "modelList")

export default class ModelStore {
    async GetModelListElement() {
        const list = await db.getAll()
        let html = `
            <ol class="list-group list-group-numbered">`
        list.forEach((model) => {
            html += `
            <li class="list-group-item d-flex justify-content-between align-items-start">
                <div class="ms-2 me-auto">
                <div class="fw-bold">${model.title}</div>
                    ${model.date}
                </div>
                <span class="badge bg-primary rounded-pill">0</span>
            </li>`
        })
        html += `
            </ol>
            `
        if (list.length == 0) html = "Empty Models"
        const dom = document.createElement('div')
        dom.innerHTML = html
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
    async trainAndSaveModel(model: tf.Sequential, { download = false, title = "myModel" } = {}) {
        // 모델 다운로드 저장
        if (download) {
            await model.save(`downloads://${title}`);
        }
        await this.saveModelToIndexedDB(model, title);
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


    async saveModelToIndexedDB(model: tf.LayersModel, title: string) {
        const modelPath = 'indexeddb://' + title;
        await model.save(modelPath);
        console.log(`모델이 IndexedDB에 저장되었습니다: ${modelPath}`);
        db.add({ title, date: Date.now() })
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

