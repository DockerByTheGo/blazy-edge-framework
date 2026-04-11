
import { password, type WebSocket } from "bun";
import { ur } from "zod/locales";
class WebsocketConnectionSingleTon {
    static ws: WebSocket | null = null;

    static get(url: string) {
        if (WebsocketConnectionSingleTon.ws === null) {
            WebsocketConnectionSingleTon.ws = new WebSocket(url);
            
            // Add event listeners for debugging
            WebsocketConnectionSingleTon.ws.addEventListener('open', () => {
                console.log("WebSocket client connection opened");
            });
            
            WebsocketConnectionSingleTon.ws.addEventListener('message', (event) => {
                console.log("WebSocket client received message:", event.data);
            });
            
            WebsocketConnectionSingleTon.ws.addEventListener('error', (error) => {
                console.error("WebSocket client error:", error);
            });
            
            WebsocketConnectionSingleTon.ws.addEventListener('close', () => {
                console.log("WebSocket client connection closed");
            });
            
            return WebsocketConnectionSingleTon.ws;
        } else {
            return WebsocketConnectionSingleTon.ws;
        }

    }
}


export const getWebsocketConnection = (url: string) => WebsocketConnectionSingleTon.get(url)