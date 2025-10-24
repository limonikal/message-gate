import * as Type from "./types.ts";

export async function createScopeWithMessageGate(
    scope: Type.SideScope, handlers?: Type.ActionsHandlersCollection
): Promise<MessageGate> {
    return MessageGate.createScopeWithMessageGate(scope, handlers);
}
export async function initScopeWithMessageGate(handlers?: Type.ActionsHandlersCollection): Promise<MessageGate> {
    return MessageGate.initScopeWithMessageGate(handlers);
}

export default class MessageGate {
    static createChannels(
        handlersA?: Type.ActionsHandlersCollection, handlersB?: Type.ActionsHandlersCollection
    ): [MessageGate, MessageGate] {
        const gateA = new MessageGate(handlersA);
        const gateB = new MessageGate(handlersB, gateA.sidePort);
        return [gateA, gateB];
    }
    static createChannelAndPort(
        handlers?: Type.ActionsHandlersCollection
    ): { gate: MessageGate, port: MessagePort } {
        const gate = new MessageGate(handlers);
        return {
            gate,
            port: gate.sidePort as MessagePort,
        };
    }
    static createPorts(): [MessagePort, MessagePort] {
        const channel = new MessageChannel();
        return [channel.port1, channel.port2];
    }
    static createFromPort(port: MessagePort, handlers?: Type.ActionsHandlersCollection): MessageGate {
        return new MessageGate(handlers, port);
    }

    static async createScopeWithMessageGate(
        scope: Type.SideScope, handlers?: Type.ActionsHandlersCollection
    ): Promise<MessageGate> {
        return new Promise((resolve) => {
            const { gate, port } = MessageGate.createChannelAndPort(handlers);
            const handler = (message: MessageEvent) => {
                switch (message.data) {
                    case "@MessageGate@getPort":
                        scope.postMessage({"@MessageGate@port": port}, [port]);
                        break;
                    case "@MessageGate@ready":
                        scope.removeEventListener("message", handler);
                        resolve(gate);
                        break;
                }
            };
            scope.addEventListener("message", handler);
            scope.postMessage("@MessageGate@start");
        });
    }
    static async initScopeWithMessageGate(handlers?: Type.ActionsHandlersCollection): Promise<MessageGate> {
        return new Promise((resolve) => {
            const handler = (message: MessageEvent) => {
                if (message.data === "@MessageGate@start") {
                    globalThis.postMessage("@MessageGate@getPort");
                    return;
                }
                if ("@MessageGate@port" in message.data) {
                    globalThis.removeEventListener("message", handler);
                    const gate = MessageGate.createFromPort(message.data["@MessageGate@port"], handlers);
                    globalThis.postMessage("@MessageGate@ready");
                    resolve(gate);
                }
            }
            globalThis.addEventListener("message", handler);
            globalThis.postMessage("@MessageGate@getPort");
        });
    }

    #messageChannel: MessageChannel | undefined;
    #myPort: MessagePort;
    #nextId = 0;
    #actions: Type.ActionsHandlersMap = new Map();
    #postRequests: Type.PostWaitersMap = new Map();

    constructor(handlers?: Type.ActionsHandlersCollection, init: MessagePort | null = null) {
        if (init === null) {
            this.#messageChannel = new MessageChannel();
            this.#myPort = this.#messageChannel.port1;
        } else {
            this.#myPort = init;
        }
        this.#myPort.addEventListener("message", this.#receive.bind(this));
        this.#myPort.addEventListener("messageerror", (error) => {
            this.close();
            console.error(error);
        });
        if (handlers !== undefined) {
            try {
                if (handlers instanceof Map) {
                    this.#actions = handlers;
                } else {
                    for (let [action, handler] of Object.entries(handlers)) {
                        this.on(action, handler);
                    }
                }
            } catch (er) {
                throw new Error('Field "handlers" must be Map or has ObjectType iterator');
            }
        }
        this.#myPort.start();
    }
    get sidePort() {
        if (this.#messageChannel) {
            return this.#messageChannel.port2;
        } else {
            return undefined;
        }
    }
    get _handlers() {
        return this.#actions;
    }
    get _postRequests() {
        return this.#postRequests;
    }

    on(action: Type.Action, handler: Type.ActionHandler) {
        this.#actions.set(action, handler);
    }
    off(action: Type.Action) {
        this.#actions.delete(action);
    }
    offAll() {
        this.#actions.clear();
    }
    close() {
        this.#myPort.postMessage({ meta: { type: Type.MessageType.Close } });
        this.#myPort.close();
    }

    #receive(message: Type.Message) {
        const meta = message.data.meta;
        const action = meta.action;
        const data = message.data.data;
        let handler: Type.ActionHandler | undefined;
        switch (meta.type) {
            case Type.MessageType.Close:
                this.#myPort.close();
                break;
            case Type.MessageType.Send:
                handler = this.#actions.get(action);
                if (handler !== undefined) handler(data);
                break;
            case Type.MessageType.Post:
                if (this.#actions.has(action)) {
                    this.#answerToPost(message);
                }
                break;
            case Type.MessageType.PostAnswer:
                const id = meta.id!;
                const promise = this.#postRequests.get(id);
                if (promise !== undefined) {
                    if (meta.error) {
                        promise.reject(meta.error);
                    } else {
                        promise.resolve(data);
                    }
                    this.#postRequests.delete(id);
                }
                break;
            case Type.MessageType.GetTransfer:
                if (this.#actions.has(action)) {
                    this.#answerToGetTransfer(message);
                }
                break;
        }
    }
    async #answerToPost(message: Type.Message) {
        const meta = message.data.meta;
        try {
            const result = await this.#actions.get(meta.action)!(message.data.data);
            this.#myPort.postMessage({
                meta: {
                    type: Type.MessageType.PostAnswer,
                    id: meta.id,
                },
                data: result,
            });
        } catch (e) {
            console.error(e);
            this.#myPort.postMessage({
                meta: {
                    type: Type.MessageType.PostAnswer,
                    id: meta.id,
                    error: e,
                },
                data: undefined,
            });
        }
    }
    async #answerToGetTransfer(message: Type.Message) {
        const meta = message.data.meta;
        try {
            const [result, transfer] = await this.#actions.get(meta.action)!(message.data.data);
            let Transfer = transfer;
            if (transfer !== undefined && !(transfer instanceof Array)) {
                Transfer = [transfer];
            }
            this.#myPort.postMessage({
                meta: {
                    type: Type.MessageType.PostAnswer,
                    id: meta.id,
                },
                data: result,
            }, Transfer);
        } catch (e) {
            console.error(e);
            this.#myPort.postMessage({
                meta: {
                    type: Type.MessageType.PostAnswer,
                    id: meta.id,
                    error: e,
                },
                data: undefined,
            });
        }
    }

    // simple
    send<Sending = any>(action: Type.Action, data: Sending) {
        this.#myPort.postMessage({
            meta: {
                type: Type.MessageType.Send,
                action,
            },
            data
        });
    }
    async post<Sending = any, Response = any>(action: Type.Action, data: Sending): Promise<Response> {
        const id = this.#nextId++;
        return new Promise((resolve, reject) => {
            this.#postRequests.set(id, { resolve, reject });
            this.#myPort.postMessage({
                meta: {
                    type: Type.MessageType.Post,
                    action,
                    id,
                },
                data
            });
        });
    }

    // with transfers
    sendTransfer<Sending = any>(action: Type.Action, data: Sending, transfer: Type.Transfer) {
        let Transfer: Array<Transferable>;
        if (transfer instanceof Array) {
            Transfer = transfer;
        } else {
            Transfer = [transfer];
        }
        this.#myPort.postMessage({
            meta: {
                type: Type.MessageType.Send,
                action,
            },
            data
        }, Transfer);
    }
    async postTransfer<Sending = any, Response = any>(
        action: Type.Action, data: Sending, transfer: Type.Transfer
    ): Promise<Response> {
        let Transfer: Array<Transferable>;
        if (transfer instanceof Array) {
            Transfer = transfer;
        } else {
            Transfer = [transfer];
        }
        const id = this.#nextId++;
        return new Promise((resolve, reject) => {
            this.#postRequests.set(id, { resolve, reject });
            this.#myPort.postMessage({
                meta: {
                    type: Type.MessageType.Post,
                    action,
                    id,
                },
                data
            }, Transfer);
        });
    }
    async getTransfer<Sending = any, Response = any>(action: Type.Action, data: Sending): Promise<Response> {
        const id = this.#nextId++;
        return new Promise((resolve, reject) => {
            this.#postRequests.set(id, { resolve, reject });
            this.#myPort.postMessage({
                meta: {
                    type: Type.MessageType.GetTransfer,
                    action,
                    id,
                },
                data
            });
        });
    }

    // bidirectional transfers
    async biTransfer<Sending = any, Response = any>(
        action: Type.Action, data: Sending, transfer: Type.Transfer
    ): Promise<Response> {
        let Transfer: Array<Transferable>;
        if (transfer instanceof Array) {
            Transfer = transfer;
        } else {
            Transfer = [transfer];
        }
        const id = this.#nextId++;
        return new Promise((resolve, reject) => {
            this.#postRequests.set(id, { resolve, reject });
            this.#myPort.postMessage({
                meta: {
                    type: Type.MessageType.GetTransfer,
                    action,
                    id,
                },
                data
            }, Transfer);
        });
    }
}
