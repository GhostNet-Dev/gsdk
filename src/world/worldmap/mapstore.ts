
function saveToIndexedDB<T>(data: T, key: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("ThreeJSData", 1);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains("DataStore")) {
                db.createObjectStore("DataStore");
            }
        };

        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction("DataStore", "readwrite");
            const store = transaction.objectStore("DataStore");
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
        const request = indexedDB.open("ThreeJSData", 1);

        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction("DataStore", "readonly");
            const store = transaction.objectStore("DataStore");
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

import { MapEntry } from './worldmaptypes';


async function saveDataTextureAndGeometry(
    entries:MapEntry[]
): Promise<void> {
    await saveToIndexedDB(entries, "terrainData");
    console.log("DataTexture and geometry saved to IndexedDB.");
}
function downDataTextureAndGeometry(
    entries:MapEntry[]
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


async function loadDataTextureAndGeometry(): Promise< MapEntry[] | undefined> {
    const data = await loadFromIndexedDB<MapEntry[]>("terrainData");
    if (!data) {
        console.warn("No terrain data found in IndexedDB.");
        return;
    }
    return data
}

export { saveDataTextureAndGeometry, loadDataTextureAndGeometry, downDataTextureAndGeometry}
