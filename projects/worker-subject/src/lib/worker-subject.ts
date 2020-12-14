import { fromEvent, ObjectUnsubscribedError, Subject, Subscription } from 'rxjs';

export interface ITaskMessage<T> {
  task: T
}
export interface IStateMessage<T> {
  state: T
}
export function workerSubject<T = unknown>(worker: Worker): WorkerSubject<T>
export function workerSubject<T = unknown>(): WorkerSubject<T>
export function workerSubject<T>(worker?: Worker) {
  if (worker)
    return new WorkerSubject<T>(worker);
  return new WorkerSubject<T>();
}
type WorkerScope = DedicatedWorkerGlobalScope & { terminate?: () => void };

export class WorkerSubject<T = unknown> extends Subject<T> {
  private _messageSubscription: Subscription | void
  private _messageerrorSubscription: Subscription | void
  private _errorSubscription: Subscription | void
  private worker: Worker | WorkerScope | void = void (0)

  public constructor(worker: Worker);
  public constructor();
  public constructor() {
    super();
    if (!this.worker)
      this.worker = <WorkerScope><unknown>globalThis;
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
  public next(message: any, transfer: Transferable[]): void
  public next(message: any, options?: PostMessageOptions): void
  public next(message: any, options: any) {
    if (this.closed)
      throw new ObjectUnsubscribedError();
    if (!this.isStopped && this.worker)
      if (arguments.length === 1)
        this.worker.postMessage(message);
      else
        this.worker.postMessage(message, options);
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
