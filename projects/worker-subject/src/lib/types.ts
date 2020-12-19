export interface ITaskMessage<TASK> {
  task: TASK
}
export interface IStateMessage<STATE> {
  state: STATE
}

export interface IWorkerMessage<T> {
  message: T
  options?: Transferable[] | PostMessageOptions;
}
// Too much of a pain to get DedicatedWorkerGlobalScope included in build, roll own.
export interface DedicatedWorkerGlobalScope {
  postMessage(message: any, transfer: Transferable[]): void;
  postMessage(message: any, options?: PostMessageOptions): void;
  addEventListener<K extends keyof WorkerEventMap>(type: K, listener: (this: Worker, ev: WorkerEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
  removeEventListener<K extends keyof WorkerEventMap>(type: K, listener: (this: Worker, ev: WorkerEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
  terminate?(): void; // Add to prevent error in _terminate method below.
}

export type WorkerArg=Worker | (()=>Worker) | DedicatedWorkerGlobalScope;