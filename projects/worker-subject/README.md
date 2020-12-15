# @packageforge/worker-subject

A TypeScript Observable wrapper for the Worker class. A `WorkerSubject` can be used in both the main thread (normally a browser) and/or in the worker thread. Call `subscribe` to receive messages, call `next` to send them.

Add the package to your project on the command line:
```
npm install @packageforge/worker-subject --save
```

Note, if in an Angular project, you can create a web-worker with the Angular CLI like so:
```typescript
ng g web-worker app
```

In the main thread/browser code, import the `workerSubject` function and call it with a `Worker`:
```typescript
import { workerSubject } from '@packageforge/worker-subject';

// Create a WorkerSubject:
const worker = workerSubject(new Worker('./app.worker', { type: 'module' }));

// Subscribe to messages coming from the worker thread.
worker.subscribe(message => console.log(JSON.stringify(message)));

// Send messages to the worker thread with the next method:
worker.next({ task: "DO_SOMETHING", data: 1234});
```

In the worker code, import the `workerSubject` function and call it with no parameters:
```typescript
/// <reference lib="webworker" />
import { workerSubject } from '@packageforge/worker-subject';

// Create a WorkerSubject:
const worker = workerSubject();

// Subscribe to messages coming from the main thread.
worker.subscribe(message => {
  if (message.task === "DO_SOMETHING")
    doSomething(message.data);
});

function doSomething(data: number) {
  console.log("Doing something with "+data);
  const result = data * data;
  // We are done with the task, send the result back to the main thread.
  worker.next({state: "COMPLETE", result: result});
}
```

The console output would be:
```
Doing something with 1234
{state:"COMPLETE",result:1522756}
```

To spool up a worker that terminates when the task is done or errors out, use the `takeWhile` and `finalize` operators like so:
```typescript
import { workerSubject } from '@packageforge/worker-subject';
import { takeWhile, finalize } from 'rxjs/operators';

// Create a WorkerSubject:
const worker = workerSubject(new Worker('./app.worker', { type: 'module' }));

// Subscribe to messages coming from the worker thread.
worker
  .pipe(takeWhile(message => message.state !== "COMPLETE", true)) // Use inclusive takeWhile.
  .pipe(finalize(() => worker.complete())) // Terminates the worker thread when done with task.
  .subscribe(message => console.log(JSON.stringify(message)));

// Send messages to the worker thread with the next method:
worker.next({ task: "DO_SOMETHING", data: 1234});
```


The `ITaskMessage` and `IStateMessage` can be used as a base for message types.
```typescript
export interface ITaskMessage<T> {
  task: T
}
export interface IStateMessage<T> {
  state: T
}
```

Examples:
```typescript
import { ITaskMessage, IStateMessage } from '@packageforge/worker-subject';

export type IMyTaskMessage =  // Add other tasks as needed.
    IMyDoSomethingTaskMessage;

export type IMyStateMessage =  // Add states for other tasks as needed.
    IMyDoSomethingStateMessage;

export interface IMyDoSomethingTaskMessage extends ITaskMessage<'DO_SOMETHING'> {
  data: number
}
export type IMyDoSomethingStateMessage = 
    IMyDoSomethingWorkingStateMessage | 
    IMyDoSomethingCollatingStateMessage |
    IMyDoSomethingCompleteStateMessage;

export interface IMyDoSomethingWorkingStateMessage extends IStateMessage<'WORKING'> {
  progress: number
}
export interface IMyDoSomethingCollatingStateMessage extends IStateMessage<'COLLATING'> {
  amount: number
  progress: number
}
export interface IMyDoSomethingCompleteStateMessage extends IStateMessage<'COMPLETE'> {
  result: number
}
```



In the main thread/browser code, send task messages and receive state messages:
```typescript
import { workerSubject } from '@packageforge/worker-subject';

// Create a typed WorkerSubject:
const worker = workerSubject<IMyDoSomethingTaskMessage, IMyDoSomethingStateMessage>(new Worker('./app.worker', { type: 'module' }));

// Incoming messages are now of type IMyDoSomethingStateMessage
worker
  .pipe(takeWhile(message => message.state !== "COMPLETE", true)) // Use inclusive takeWhile.
  .pipe(finalize(() => worker.complete())) // Terminates the worker thread when done with task.
  .subscribe(message => {
    if (message.state === 'WORKING') // type IMyDoSomethingWorkingStateMessage
      console.log(message.progress);
    if (message.state === 'COLLATING') // type IMyDoSomethingCollatingStateMessage
      console.log(message.progress, message.amount);
    if (message.state === 'COMPLETE') // type IMyDoSomethingCompleteStateMessage
      console.log(message.result);
  });

// Outgoing messages must be a IMyDoSomethingTaskMessage.
worker.next({ task: "DO_SOMETHING", data: 1234});
```

In the worker code it is the opposite, send state messages and receive task messages :
```typescript
/// <reference lib="webworker" />
import { workerSubject } from '@packageforge/worker-subject';

// Create a typed WorkerSubject:
const worker = workerSubject<IMyStateMessage, IMyTaskMessage>();

// Subscribe to messages coming from the main thread.
worker.subscribe(message => { // message is one of the IMyTaskMessage types.
  if (message.task === "DO_SOMETHING")
    doSomething(message.data); // message is a IMyDoSomethingTaskMessage type.
});

function doSomething(data: number) {
  // Let the main thread know we are starting.
  worker.next({state: "WORKING", progress: 0}); // IMyDoSomethingWorkingStateMessage
  // Do something intensive.
  // Let the main thread know we are half way done.
  worker.next({state: "WORKING", progress: 0.5}); // IMyDoSomethingWorkingStateMessage
  // Do something intensive.
  // Let the main thread know we are finishing up.
  worker.next({state: "COLLATING", progress: 0.75, amount: 110}); // IMyDoSomethingCollatingStateMessage
  // Collate that data.
  // Task complete, send the results.
  worker.next({state: "COMPLETE", result: 110*data}); // IMyDoSomethingCompleteStateMessage
}
```

Output:
```
0
0.5
0.75 110
135740
```
