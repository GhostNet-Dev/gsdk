const DBName = "ThreeJSData"
const StoreName = "DataStore"
function saveToIndexedDB<T>(data: T, key: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DBName, 1);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(StoreName)) {
                db.createObjectStore(StoreName);
            }
        };

        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(StoreName, "readwrite");
            const store = transaction.objectStore(StoreName);
            store.put(data, key);

            transaction.oncomplete = () => {
                db.close();
                resolve();
            };

            transaction.onerror = () => {
                db.close();
                reject(transaction.error);
            };
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

function loadFromIndexedDB<T>(key: string): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DBName, 1);

        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(StoreName, "readonly");
            const store = transaction.objectStore(StoreName);
            const getRequest = store.get(key);

            getRequest.onsuccess = () => {
                resolve(getRequest.result);
                db.close();
            };

            getRequest.onerror = () => {
                reject(getRequest.error);
                db.close();
            };
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

async function getAllData<T>(dbName: string, storeName: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName);

        request.onsuccess = (event: Event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            let transaction: IDBTransaction;
            let store: IDBObjectStore;

            try {
                transaction = db.transaction(storeName, "readonly");
                store = transaction.objectStore(storeName);
            } catch (error) {
                console.error(`스토어(${storeName})를 찾을 수 없습니다.`, error);
                reject(`스토어(${storeName})를 찾을 수 없습니다.`);
                return;
            }

            const getAllRequest = store.getAll();

            getAllRequest.onsuccess = () => {
                resolve(getAllRequest.result as T[]);
            };

            getAllRequest.onerror = () => {
                reject(getAllRequest.error);
            };
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

import { formatTimeDifference } from '@Glibs/helper/utils';
import IEventController from '@Glibs/interface/ievent';
import { MapPackage } from '@Glibs/types/worldmaptypes';


async function saveDataTextureAndGeometry(
    key: string,
    data: MapPackage
): Promise<void> {
    await saveToIndexedDB(data, key);
    console.log("DataTexture and geometry saved to IndexedDB.");
}
function downDataTextureAndGeometry(
    entries: MapPackage
) {
    const dataToSave = entries
    const blob = new Blob([JSON.stringify(dataToSave)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'terrain.json'
    a.click()
    URL.revokeObjectURL(url)
}

async function loadDataTextureAndGeometry(key: string): Promise<MapPackage | undefined> {
    const data = await loadFromIndexedDB<MapPackage>(key);
    if (!data) {
        console.warn("No terrain data found in IndexedDB.");
        return;
    }
    return data
}

async function getAllDataTextureAndGeometry(): Promise<MapPackage[] | undefined> {
    const data = await getAllData<MapPackage>(DBName, StoreName);
    if (!data) {
        console.warn("No terrain data found in IndexedDB.");
        return;
    }
    return data
}
async function getDataListElement(eventCtrl: IEventController, click: Function) {
    let list: MapPackage[] | undefined
    try {
        list = await getAllDataTextureAndGeometry()
    } catch (e) {
        return
    }
    if (!list) return

    const ol = document.createElement("ol")
    ol.classList.add("list-group", "list-group-numbered")
    list.forEach((model) => {
        const li = document.createElement("li")
        li.classList.add("list-group-item", "d-flex", "justify-content-between", "align-items-start")
        const div1 = document.createElement("div")
        div1.classList.add("ms-2", "me-auto")
        const div2 = document.createElement("div")
        div2.classList.add("fw-bold")
        div2.innerText = model.key
        div1.appendChild(div2)
        div1.insertAdjacentText("afterbegin", formatTimeDifference(model.date))
        const span = document.createElement("span")
        span.classList.add("badge", "bg-primary", "rounded-pill")
        li.appendChild(div1)
        li.appendChild(span)
        li.onclick = async () => {
            click(model.key)
        }
        ol.appendChild(li)
    })
    const dom = document.createElement('div')
    dom.appendChild(ol)
    return dom
}
export { saveDataTextureAndGeometry, loadDataTextureAndGeometry, downDataTextureAndGeometry, getAllDataTextureAndGeometry, getDataListElement }
