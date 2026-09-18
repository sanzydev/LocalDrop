import { WsEvent, WsMessageType } from '../types/network';

type EventCallback<T = any> = (payload: T) => void;

export class LocalDropWebSocket {
  private ws: WebSocket | null = null;
  private url: string = '';
  private token: string = '';
  private reconnectTimeout: any = null;
  private pingInterval: any = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private isExplicitlyClosed = false;

  connect(baseUrl: string, token: string) {
    this.token = token;
    this.isExplicitlyClosed = false;

    const wsUrl = new URL(baseUrl);
    wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    wsUrl.pathname = '/ws';
    if (token) {
      wsUrl.searchParams.set('token', token);
    }

    this.url = wsUrl.toString();
    this.initSocket();
  }

  getToken(): string {
    return this.token;
  }

  private initSocket() {
    if (this.ws) {
      this.ws.close();
    }

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.emit('connection_change', { status: 'connected' });
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const data: WsEvent = JSON.parse(event.data);
          this.emit(data.type, data.payload);
        } catch {}
      };

      this.ws.onclose = () => {
        this.emit('connection_change', { status: 'disconnected' });
        this.stopHeartbeat();
        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = () => {
        this.emit('connection_change', { status: 'error' });
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping', payload: {} }));
      }
    }, 15000);
  }

  private stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout || this.isExplicitlyClosed) return;
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.initSocket();
    }, 3000);
  }

  on<T = any>(event: WsMessageType | 'connection_change', callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emit(event: string, payload: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(payload);
        } catch (err) {
          console.error(`Error in WebSocket listener for ${event}:`, err);
        }
      });
    }
  }

  disconnect() {
    this.isExplicitlyClosed = true;
    this.stopHeartbeat();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const wsService = new LocalDropWebSocket();
