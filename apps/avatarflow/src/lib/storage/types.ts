export interface StoredObject {
  url: string;
  key: string;
}

export interface StorageAdapter {
  put(input: {
    key: string;
    body: Buffer<ArrayBufferLike>;
    contentType: string;
  }): Promise<StoredObject>;
  remove(key: string): Promise<void>;
}
