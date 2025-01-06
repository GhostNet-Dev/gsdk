export default class IndexedDBService<T> {
  private dbName: string;
  private storeName: string;
  private version: number;
  private db: IDBDatabase | null = null;

  constructor(dbName: string, storeName: string, version: number = 1) {
    this.dbName = dbName;
    this.storeName = storeName;
    this.version = version;
  }

  // Initialize the database
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: "id", autoIncrement: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onerror = (event) => {
        reject(`Failed to open database: ${(event.target as IDBOpenDBRequest).error}`);
      };
    });
  }

  // Add data
  async add(data: T): Promise<number> {
    if (!this.db) throw new Error("Database not initialized");
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.add(data);

      request.onsuccess = () => {
        resolve(request.result as number);
      };

      request.onerror = (event) => {
        reject(`Failed to add data: ${(event.target as IDBRequest).error}`);
      };
    });
  }

  // Get data by key
  async get(id: number): Promise<T | undefined> {
    if (!this.db) throw new Error("Database not initialized");
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result as T | undefined);
      };

      request.onerror = (event) => {
        reject(`Failed to get data: ${(event.target as IDBRequest).error}`);
      };
    });
  }

  // Get all data
  async getAll(): Promise<T[]> {
    if (!this.db) throw new Error("Database not initialized");
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result as T[]);
      };

      request.onerror = (event) => {
        reject(`Failed to get all data: ${(event.target as IDBRequest).error}`);
      };
    });
  }

  // Update data
  async update(id: number, data: Partial<T>): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        const existingData = request.result;
        if (existingData) {
          const updatedData = { ...existingData, ...data };
          const updateRequest = store.put(updatedData);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = (event) => reject(`Failed to update data: ${(event.target as IDBRequest).error}`);
        } else {
          reject(`Data with id ${id} not found`);
        }
      };

      request.onerror = (event) => {
        reject(`Failed to fetch data for update: ${(event.target as IDBRequest).error}`);
      };
    });
  }

  // Delete data
  async delete(id: number): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();

      request.onerror = (event) => {
        reject(`Failed to delete data: ${(event.target as IDBRequest).error}`);
      };
    });
  }
}

