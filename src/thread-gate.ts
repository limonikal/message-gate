enum MessageType {
    Send = 1,
    Post = 2,
    PostAnswer = 3,
    Close = -1,
}

export default class ThreadGate {
    static createChannels(
        handlersA?: Record<string, Function>, handlersB?: Record<string, Function>
    ): [ThreadGate, ThreadGate] {
        const gateA = new ThreadGate(handlersA);
        const gateB = new ThreadGate(handlersB, gateA.sidePort);
        return [gateA, gateB];
    }
    static createChannelAndPort(
        handlers?: Record<string, Function>
    ): { gate: ThreadGate, port: MessagePort } {
        const gate = new ThreadGate(handlers);
        return {
            gate,
            port: gate.sidePort as MessagePort,
        };
    }
    static createPorts(): [MessagePort, MessagePort] {
        const channel = new MessageChannel();
        return [channel.port1, channel.port2];
    }
    static createFromPort(port: MessagePort, handlers?: Record<string, Function>): ThreadGate {
        return new ThreadGate(handlers, port);
    }

    #messageChannel: MessageChannel | undefined;
    #myPort: MessagePort;
    #nextId = 0;
    #actions: Record<string, Function> = {};
    #postRequests: Record<string, Function> = {};

    constructor(handlers?: Record<string, Function>, init: MessagePort | null = null) {
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
        if (handlers) {
            for (let [action, handler] of Object.entries(handlers)) {
                this.on(action, handler);
            }
        }
        this.#myPort.start();
    }

    on(action: string, handler: Function) {
        this.#actions[action] = handler;
    }
    off(action: string) {
        delete this.#actions[action];
    }

    #receive(message: any) {
        switch (message.data.meta.type) {
            case MessageType.Close:
                this.#myPort.close();
                break;
            case MessageType.Send:
                if (message.data.meta.action in this.#actions) {
                    this.#actions[message.data.meta.action](message.data.data);
                }
                break;
            case MessageType.Post:
                if (message.data.meta.action in this.#actions) {
                    this.#answerToPost(message.data);
                }
                break;
            case MessageType.PostAnswer:
                if (message.data.meta.id in this.#postRequests) {
                    this.#postRequests[message.data.meta.id](message.data.data);
                    delete this.#postRequests[message.data.meta.id];
                }
                break;
        }
    }
    async #answerToPost(message: any) {
        const result = await this.#actions[message.meta.action](message.data);
        this.#myPort.postMessage({
            meta: {
                type: MessageType.PostAnswer,
                id: message.meta.id,
            },
            data: result,
        });
    }

    send(action: string, data: any) {
        this.#myPort.postMessage({
            meta: {
                type: MessageType.Send,
                action,
            },
            data
        });
    }
    async post(action: string, data: any) {
        const id = this.#nextId++;
        return new Promise(resolve => {
            this.#postRequests[id] = resolve;
            this.#myPort.postMessage({
                meta: {
                    type: MessageType.Post,
                    action,
                    id,
                },
                data
            });
        });
    }
    sendTransfer(action: string, data: any, transfer: Array<Transferable> | Transferable) {
        let Transfer: Array<Transferable>;
        if (transfer instanceof Array) {
            Transfer = transfer;
        } else {
            Transfer = [transfer];
        }
        this.#myPort.postMessage({
            meta: {
                type: MessageType.Send,
                action,
            },
            data
        }, Transfer);
    }
    async postTransfer(action: string, data: any, transfer: Array<Transferable> | Transferable) {
        let Transfer: Array<Transferable>;
        if (transfer instanceof Array) {
            Transfer = transfer;
        } else {
            Transfer = [transfer];
        }
        const id = this.#nextId++;
        return new Promise(resolve => {
            this.#postRequests[id] = resolve;
            this.#myPort.postMessage({
                meta: {
                    type: MessageType.Post,
                    action,
                    id,
                },
                data
            }, Transfer);
        });
    }

    get sidePort() {
        if (this.#messageChannel) {
            return this.#messageChannel.port2;
        } else {
            return undefined;
        }
    }
    close() {
        this.#myPort.postMessage({ meta: { type: MessageType.Close } });
        this.#myPort.close();
    }
}
