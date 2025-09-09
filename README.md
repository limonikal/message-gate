# Message Gate
A lightweight library for seamless communication between threads, workers, and isolated contexts in JavaScript and TypeScript.

### Features

- 🔄 Bidirectional communication between any contexts
- 📨 Synchronous and asynchronous messaging
- 🏷 Type-safe with full TypeScript support
- 🚀 Zero dependencies and minimal footprint
- 🔧 Transferable objects support
- ⚡ Easy setup with simple API

### Installation
```bash
npm install message-gate
```

## Browser Support

- ✅ Modern browsers (Chrome, Firefox, Safari, Edge)
- ✅ Web Workers
- ✅ Service Workers
- ✅ iframe communication
- ✅ Node.js with worker_threads

## Performance

- ⚡ Lightweight: ~2KB gzipped
- 🚀 Zero dependencies
- 🔄 Efficient message routing
- 📦 Tree-shakable API

## How to use

### Create a channel in one scope
```typescript
import MessageGate from "message-gate";

const [ gateA, gateB ] = MessageGate.createChannels();
```

### Create a channel between two scopes (e.g., main and worker)
##### main.ts
```typescript
import MessageGate from "message-gate";

const worker = new Worker("WORKER_URL", { type: "module" });
const { gate, port } = MessageGate.createChannelAndPort();
worker.postMessage(port, port);
```
##### worker.ts
```typescript
import MessageGate from "message-gate";

self.onmessage = (port) => {
    self.gate = MessageGate.createFromPort(port);
    self.onmessage = undefined;
}
```

## API Reference

### Static Methods
`MessageGate.createChannels(handlersA?, handlersB?)`

Creates two interconnected channels.

```typescript
const [gateA, gateB] = MessageGate.createChannels(
    { 'event-a': handlerA },
    { 'event-b': handlerB }
);
```

`MessageGate.createChannelAndPort(handlers?)`

Creates a gate and returns both the gate and its port.

```typescript
const { gate, port } = MessageGate.createChannelAndPort(handlers);
```

`MessageGate.createFromPort(port, handlers?)`

Creates a gate from an existing MessagePort.

```typescript
const gate = MessageGate.createFromPort(messagePort, {
    'custom-event': (data) => { /* handler */ }
});
```

`MessageGate.createPorts()`

Creates a pair of connected MessagePorts.

```typescript
const [port1, port2] = MessageGate.createPorts();
```

### Instance Methods

#### Register a message handler.
`on(action: string, handler: Function)`

```typescript
gate.on('data-received', (data) => {
    console.log('Data:', data);
});
```

#### Remove a message handler.
`off(action: string)`

```typescript
gate.off('data-received');
```

####  Send a synchronous message.
`send(action: string, data: any)`

```typescript
gate.send('update-data', { value: 42 });
```

#### Send an asynchronous message and await response.
`post(action: string, data: any): Promise<any>`

```typescript
const result = await gate.post('fetch-data', { query: 'test' });
```

#### Send a synchronous message with transferable objects.
`sendTransfer(action: string, data: any, transfer: Transferable[])`

```typescript
const buffer = new ArrayBuffer(1024);
gate.sendTransfer('transfer-data', { buffer }, [buffer]);
```

#### Async message with transferable objects.
`postTransfer(action: string, data: any, transfer: Transferable[]): Promise<any>`

```typescript
const result = await gate.postTransfer('process-buffer', { buffer }, [buffer]);
```

#### Close the communication channel.
`close()`

```typescript
gate.close();
```

### Properties
`sidePort: MessagePort | undefined`

Get the opposite port of the channel if gate was created with `new MessageGate()`.

```typescript
const oppositePort = gate.sidePort;
```

### Advanced Usage

#### Transferable Objects
```typescript
// Send large data efficiently
const largeBuffer = new ArrayBuffer(1024 * 1024);
gate.sendTransfer('large-data', { buffer: largeBuffer }, [largeBuffer]);

// Receive and process transferables
gate.on('large-data', (data) => {
    // data.buffer is now transferred, not copied
    processBuffer(data.buffer);
});
```

### Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

### License
MIT License - feel free to use in commercial projects.

### Support
For bugs and feature requests, please create an issue on GitHub.
