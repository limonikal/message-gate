export enum MessageType {
    Send = 1,
    Post = 2,
    PostAnswer = 3,
    GetTransfer = 4,
    Close = -1,
}

export type Action = string | number;

export type ActionHandler = Function;
export type ActionsHandlersCollection = Record<Action, ActionHandler>;
export type ActionsHandlersMap = Map<Action, ActionHandler>;

export type Message = {
    data: {
        meta: {
            type: MessageType,
            action: Action,
            id: number | undefined,
        },
        data: any,
    }
};

export type Transfer = Array<Transferable> | Transferable;

export type SideScope = { addEventListener: Function, removeEventListener: Function, postMessage: Function };
