import { fromEvent, ObjectUnsubscribedError, Observable, Observer, Subject, Subscription } from 'rxjs';
import { IWorkerMessage, WorkerArg } from './types';

export function workerSubject<SEND, RECEIVE>(worker: WorkerArg): WorkerSubject<SEND, RECEIVE>
export function workerSubject<SEND>(): WorkerSubject<SEND, IWorkerMessage<SEND>>
export function workerSubject<SEND, RECEIVE = IWorkerMessage<SEND>>(worker?: WorkerArg) {
  if (worker)
    return new WorkerSubject<SEND, RECEIVE>(worker);
  return new WorkerSubject<SEND, RECEIVE>();
}

export class WorkerSubject<SEND, RECEIVE = IWorkerMessage<SEND>> extends Subject<RECEIVE> {
  private _messageSubscription?: Subscription
  private _messageerrorSubscription?: Subscription
  private _errorSubscription?: Subscription

  public constructor(worker: WorkerArg, source?: Observable<IWorkerMessage<SEND>>);
  public constructor();
  public constructor(private worker?: WorkerArg, private source?: Observable<IWorkerMessage<SEND>>) {
    super();
    if (this.source)
      this.source.subscribe(workerMessage => {
        this._send(workerMessage.message, workerMessage.options)
      });
  }
  subscribe(observer?: Partial<Observer<RECEIVE>>): Subscription;
  /** @deprecated Use an observer instead of a complete callback */
  subscribe(next: null | undefined, error: null | undefined, complete: () => void): Subscription;
  /** @deprecated Use an observer instead of an error callback */
  subscribe(next: null | undefined, error: (error: any) => void, complete?: () => void): Subscription;
  /** @deprecated Use an observer instead of a complete callback */
  subscribe(next: (value: RECEIVE) => void, error: null | undefined, complete: () => void): Subscription;
  subscribe(next?: (value: RECEIVE) => void, error?: (error: any) => void, complete?: () => void): Subscription;
  subscribe(...args:any[]): Subscription {
    this._connect();
    const unsub = super.subscribe(...args);
    if (this.worker)
      unsub.add(() => {
        if (this.observers.length === 0)
          this._disconnect();
      });
    return unsub;
  }
  private _connect() {
    if (this.worker) {
      if (typeof (this.worker) === "function")
        this.worker = this.worker();
      this._messageSubscription = fromEvent<MessageEvent<RECEIVE>>(this.worker, "message")
        .subscribe(message => super.next(message.data))
      this._messageerrorSubscription = fromEvent<MessageEvent<RECEIVE>>(this.worker, "messageerror")
        .subscribe(message => super.error(message))
      this._errorSubscription = fromEvent<ErrorEvent>(this.worker, "error")
        .subscribe(message => super.error(message))
    }
  }
  private _send(message: SEND, options: Transferable[] | PostMessageOptions | undefined) {
    if (this.worker) {
      if (typeof (this.worker) === "function")
        this.worker = this.worker();
      if (Array.isArray(options))
        this.worker.postMessage(message, options);
      else if (typeof (options) === "object")
        this.worker.postMessage(message, options);
      else
        this.worker.postMessage(message);
    }
  }
  private _disconnect() {
    if (this._messageSubscription)
      this._messageSubscription = <any>this._messageSubscription!.unsubscribe();
    if (this._messageerrorSubscription)
      this._messageerrorSubscription = <any>this._messageerrorSubscription!.unsubscribe();
    if (this._errorSubscription)
      this._errorSubscription = <any>this._errorSubscription!.unsubscribe();
  }
  private _terminate() {
    if (this.worker && typeof (this.worker) !== "function" && this.worker.terminate) {
      this._disconnect();
      this.worker.terminate();
      this.worker = undefined;
    }
  }
  // @ts-ignore Suppress property 'next' is not assignable to the same property in base type error.
  public next(message: SEND, transfer: Transferable[]): void;
  // @ts-ignore Suppress property 'next' is not assignable to the same property in base type error.
  public next(message: SEND, options?: PostMessageOptions): void;
  // @ts-ignore Suppress property 'next' is not assignable to the same property in base type error.
  public next(message: SEND, options?: any) {
    if (this.closed)
      throw new ObjectUnsubscribedError();
    if (!this.isStopped)
      if (this.worker)
        this._send(message, options);
      else
        super.next(<any>{ message: message, options: options });
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
