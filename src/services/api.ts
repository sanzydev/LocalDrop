import { ServerInfo, PublicStatus } from '../types/network';
import { SharedFile } from '../types/transfer';

export class LocalDropApiClient {
  private baseUrl: string;
  private token: string;

  constructor() {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('token');
      if (urlToken) {
        this.token = urlToken;
        localStorage.setItem('localdrop_pairing_token', urlToken);
      } else {
        this.token = localStorage.getItem('localdrop_pairing_token') || '';
      }

      if (window.location.port === '1420') {
        this.baseUrl = 'http://localhost:3000';
      } else {
        this.baseUrl = window.location.origin;
      }
    } else {
      this.baseUrl = 'http://localhost:3000';
      this.token = '';
    }
  }

  setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/+$/, '');
  }

  setToken(token: string) {
    this.token = token.trim();
    if (this.token) {
      localStorage.setItem('localdrop_pairing_token', this.token);
    } else {
      localStorage.removeItem('localdrop_pairing_token');
    }
  }

  getToken(): string {
    return this.token;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  private getHeaders(explicitToken?: string): Record<string, string> {
    const token = explicitToken !== undefined ? explicitToken : this.token;
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['x-pairing-token'] = token;
    }
    return headers;
  }

  async getPublicStatus(): Promise<PublicStatus> {
    const response = await fetch(`${this.baseUrl}/api/status`);
    if (!response.ok) {
      throw new Error(`Failed to fetch public status: ${response.status}`);
    }
    return await response.json();
  }

  async getServerInfo(explicitToken?: string): Promise<ServerInfo> {
    const tokenToUse = explicitToken !== undefined ? explicitToken : this.token;
    const url = new URL(`${this.baseUrl}/api/info`);
    if (tokenToUse) {
      url.searchParams.set('token', tokenToUse);
    }

    const response = await fetch(url.toString(), {
      headers: this.getHeaders(tokenToUse),
    });

    if (response.status === 401) {
      throw new Error('UNAUTHORIZED_TOKEN');
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch server info: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  async getSharedFiles(): Promise<SharedFile[]> {
    const url = new URL(`${this.baseUrl}/api/files`);
    if (this.token) {
      url.searchParams.set('token', this.token);
    }

    const response = await fetch(url.toString(), {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch files: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  getDownloadUrl(fileId: string): string {
    const url = new URL(`${this.baseUrl}/api/download/${fileId}`);
    if (this.token) {
      url.searchParams.set('token', this.token);
    }
    return url.toString();
  }

  async downloadZip(fileIds: string[]): Promise<Blob> {
    const url = new URL(`${this.baseUrl}/api/download-zip`);
    if (this.token) {
      url.searchParams.set('token', this.token);
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ file_ids: fileIds }),
    });

    if (!response.ok) {
      throw new Error(`Bulk download failed: ${response.status} ${response.statusText}`);
    }

    return await response.blob();
  }

  uploadFile(
    file: File,
    onProgress?: (loaded: number, total: number) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const url = new URL(`${this.baseUrl}/api/upload`);
      if (this.token) {
        url.searchParams.set('token', this.token);
      }

      xhr.open('POST', url.toString(), true);
      if (this.token) {
        xhr.setRequestHeader('Authorization', `Bearer ${this.token}`);
        xhr.setRequestHeader('x-pairing-token', this.token);
      }
      xhr.setRequestHeader('x-file-size', file.size.toString());
      xhr.setRequestHeader('x-file-name', encodeURIComponent(file.name));

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            onProgress(e.loaded, e.total);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data[0] || file.name);
          } catch {
            resolve(file.name);
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error during file upload'));
      };

      xhr.onabort = () => {
        reject(new Error('Upload cancelled'));
      };

      const formData = new FormData();
      formData.append('file', file, file.name);
      xhr.send(formData);
    });
  }

  async cancelTransfer(transferId: string): Promise<void> {
    const url = `${this.baseUrl}/api/cancel/${transferId}`;
    await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
    });
  }
}

export const apiClient = new LocalDropApiClient();
