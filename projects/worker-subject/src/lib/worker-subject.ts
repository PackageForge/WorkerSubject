import { fromEvent, ObjectUnsubscribedError, Subject, Subscription } from 'rxjs';

export interface ITaskMessage<T> {
  task: T
}
export interface IStateMessage<T> {
  state: T
}
export function workerSubject<T, N>(worker: Worker): WorkerSubject<T, N>
export function workerSubject<T, N>(): WorkerSubject<T, N>
export function workerSubject<T, N>(worker?: Worker) {
  if (worker)
    return new WorkerSubject<T, N>(worker);
  return new WorkerSubject<T, N>();
}

// Too much of a pain to get DedicatedWorkerGlobalScope included in build, roll own.
interface DedicatedWorkerGlobalScope {
  postMessage(message: any, transfer: Transferable[]): void;
  postMessage(message: any, options?: PostMessageOptions): void;
  addEventListener<K extends keyof WorkerEventMap>(type: K, listener: (this: Worker, ev: WorkerEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
  removeEventListener<K extends keyof WorkerEventMap>(type: K, listener: (this: Worker, ev: WorkerEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
  terminate?(): void; // Add to prevent error in _terminate method below.
}

export class WorkerSubject<T, N> extends Subject<T> {
  private _messageSubscription: Subscription | void
  private _messageerrorSubscription: Subscription | void
  private _errorSubscription: Subscription | void
  private worker: Worker | DedicatedWorkerGlobalScope | void = void (0)

  public constructor(worker: Worker);
  public constructor();
  public constructor(worker?: Worker) {
    super();
    if (worker)
      this.worker = worker;
    else
      this.worker = <DedicatedWorkerGlobalScope><unknown>globalThis;
    this._messageSubscription = fromEvent<MessageEvent<T>>(this.worker, "message")
      .subscribe(message => super.next(message.data))
    this._messageerrorSubscription = fromEvent<MessageEvent<T>>(this.worker, "messageerror")
      .subscribe(message => super.error(message))
    this._errorSubscription = fromEvent<ErrorEvent>(this.worker, "error")
      .subscribe(message => super.error(message))
  }
  private _terminate() {
    if (this.worker && this.worker.terminate) {
      if (this._messageSubscription)
        this._messageSubscription = this._messageSubscription!.unsubscribe();
      if (this._messageerrorSubscription)
        this._messageerrorSubscription = this._messageerrorSubscription!.unsubscribe();
      if (this._errorSubscription)
        this._errorSubscription = this._errorSubscription!.unsubscribe();
      this.worker = this.worker.terminate();
    }
  }
  public next(message: N, transfer: Transferable[]): void;
  public next(message: N, options?: PostMessageOptions): void;
  public next(message: T): void; // Grrr, can't get rid of this.
  public next(message: T | N, options?: any) {
    if (this.closed)
      throw new ObjectUnsubscribedError();
    if (!this.isStopped && this.worker)
      if (arguments.length === 2)
        this.worker.postMessage(message, options);
      else
        this.worker.postMessage(message);
  }
  public error(err: any) {
    this._terminate();
    super.error(err);
  }
  public complete() {
    this._terminate();
    super.complete();
  }
}