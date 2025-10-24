export enum MessageType {
    Error = 0,
    Send = 1,
    Post = 2,
    PostAnswer = 3,
    GetTransfer = 4,
    Close = -1,
}

export type Action = string | number;

export type ActionHandler = Function;
export type ActionsHandlersCollection = Record<Action, ActionHandler> | ActionsHandlersMap;
export type ActionsHandlersMap = Map<Action, ActionHandler>;

export type PostWaitersMap = Map<number, { resolve: (data: any) => void, reject: (data: any) => void }>

export type Message = {
    data: {
        meta: {
            type: MessageType,
            action: Action,
            id: number | undefined,
            error?: Error,
        },
        data: any,
    }
};

export type Transfer = Array<Transferable> | Transferable;

export type SideScope = { addEventListener: Function, removeEventListener: Function, postMessage: Function };
