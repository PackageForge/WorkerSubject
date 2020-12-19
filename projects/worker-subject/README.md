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

## `WorkerSubject`

#### 1: Bare-bones use

In the main thread/browser code, import the `workerSubject` function and call it with a `Worker` object:
```typescript
import { workerSubject } from '@packageforge/worker-subject';

  // Create a WorkerSubject:
  const worker = workerSubject(new Worker('./test1.worker', { type: 'module', name: 'test1' }));

  // Subscribe to messages coming from the worker thread.
  worker.subscribe((message: any) => console.log(JSON.stringify(message)));

  // Send messages to the worker thread with the next method:
  worker.next({ task: "DO_SOMETHING", data: 1234 });
```

In the worker code, import the `workerSubject` function and call it with the `globalThis` object:
```typescript
/// <reference lib="webworker" />
import { workerSubject } from '@packageforge/worker-subject';

// Create a WorkerSubject:
const worker = workerSubject(globalThis);

// Subscribe to messages coming from the main thread.
worker.subscribe((message: any) => {
  if (message.task === "DO_SOMETHING")
    doSomething(message.data);
});

function doSomething(data: number) {
  console.log("Doing something with " + data);
  const result = data * data;
  // We are done with the task, send the result back to the main thread.
  worker.next({ state: "COMPLETE", result: result });
}
```

The console output would be:
```
Doing something with 1234
test1.ts:9 {"state":"COMPLETE","result":1522756}
```
#### 2: Auto-terminating

To spool up a worker that terminates when the task is done or errors out, use the `takeWhile` and `finalize` operators in the main thread/browser code like so:
```typescript
import { workerSubject } from '@packageforge/worker-subject';
import { finalize, takeWhile } from 'rxjs/operators';

  // Create a WorkerSubject:
  const worker = workerSubject(new Worker('./test1.worker', { type: 'module', name: "test1" }));

  // Subscribe to messages coming from the worker thread.
  worker
    .pipe(takeWhile((message: any) => message.state !== "COMPLETE", true)) // Use inclusive takeWhile.
    .pipe(finalize(() => worker.complete())) // Terminates the worker thread when done with task.
    .subscribe(message => console.log(JSON.stringify(message)));

  // Send messages to the worker thread with the next method:
  worker.next({ task: "DO_SOMETHING", data: 1234 });
```
#### 3: Strictly typed

The `ITaskMessage` and `IStateMessage` can be used as a base for message types:
```typescript
export interface ITaskMessage<T> {
  task: T
}
export interface IStateMessage<T> {
  state: T
}
```

Example `my-types.ts` file:
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
import { finalize, takeWhile } from 'rxjs/operators';
import { IMyDoSomethingTaskMessage, IMyDoSomethingStateMessage } from './my-types';

  // Create a typed WorkerSubject:
  const worker = workerSubject<IMyDoSomethingTaskMessage, IMyDoSomethingStateMessage>(new Worker('./test3.worker', { type: 'module', name: "test3" }));

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
  worker.next({ task: "DO_SOMETHING", data: 1234 });
```

In the worker code it is the opposite, send state messages and receive task messages :
```typescript
/// <reference lib="webworker" />
import { workerSubject } from '@packageforge/worker-subject';
import { IMyStateMessage, IMyTaskMessage } from './my-types';

// Create a typed WorkerSubject:
const worker = workerSubject<IMyStateMessage, IMyTaskMessage>(globalThis);

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

## `workerOperator`

#### 4: Injecting common data into all task and state messages.

Sometimes messages need to be manipulated in a common way before being sent to the other end. Common configuration, environment, or session settings are examples. Instead of the `WorkerSubject` immediately sending the message, it can pass along as a normal subject would, to be sent by the `workerOperator` operator using pipes instead. Connection errors can also be handled using pipes.

In both the main thread/browser code and the worker thread, do not pass any parameters (and at most one type parameter). Then pipe that into whatever data manipulation operator is needed (a simple `tap` can be used to inject data). Then pipe that into the `workerOperator`, passing a `Worker` object (main thread/browser code) or the `globalThis` object (worker thread), and a type parameter if desired.

Note that two variables are being managed now:
* The instance of the `WorkerSubject`, whose `next` method is called to send messages.
* The instance of an `Observable` piped from that subject, whose `pipe` and `subscribe` methods are called to connect and listen for messages.

The example below builds on the example above, adding the user id to every message send out, and the processing time to every message back.

First, add the new properties to the types:
```typescript
import { ITaskMessage, IStateMessage } from '@packageforge/worker-subject';

export type IMyTaskMessage =
  IMyDoSomethingTaskMessage;

export type IMyStateMessage =
  IMyDoSomethingStateMessage;

export interface IMyDoSomethingTaskMessage extends ITaskMessage<'DO_SOMETHING'> {
  userId?: string // The user id to be filled in for all task messages.
  data: number
}
export type IMyDoSomethingStateMessage =
  IMyDoSomethingWorkingStateMessage |
  IMyDoSomethingCollatingStateMessage |
  IMyDoSomethingCompleteStateMessage;

export interface IMyDoSomethingWorkingStateMessage extends IStateMessage<'WORKING'> {
  ticks?: number // The processing time to be filled in for all state messages.
  progress: number
}
export interface IMyDoSomethingCollatingStateMessage extends IStateMessage<'COLLATING'> {
  ticks?: number // The processing time to be filled in for all state messages.
  amount: number
  progress: number
}
export interface IMyDoSomethingCompleteStateMessage extends IStateMessage<'COMPLETE'> {
  ticks?: number // The processing time to be filled in for all state messages.
  result: number
}
```

In the main thread/browser code, call `workerSubject` without a parameter and store that as a variable. Then pipe off that variable to first modify all outgoing messages, then pipe to `workerOperator` passing a `Worker` object, and save that observable as a second variable. When sending a message, subscribe to this second variable.

Example:
```typescript
import { workerSubject, workerOperator } from '@packageforge/worker-subject';
import { finalize, takeWhile, tap } from 'rxjs/operators';
import { IMyDoSomethingTaskMessage, IMyDoSomethingStateMessage } from './my-types';

  // Placeholder function to get user id.
  function getUserId() {
    return "ABC_USER_ID";
  }

  // Create a typed WorkerSubject. Note no parameter, and only one type parameter :
  const worker = workerSubject<IMyDoSomethingTaskMessage>();

  const workerModifier = worker
    .pipe(tap(data => {
      data.message.userId = getUserId() // Modify all task messages to add the user id.
    }))
    // Attach the Worker, also passing the state message type parameter if desired.
    .pipe(workerOperator<IMyDoSomethingStateMessage>(new Worker('./test4.worker', { type: 'module', name: "test4" })));

  // Use workerModifier to listen for incoming messages in much the same way:
  workerModifier
    .pipe(takeWhile(message => message.state !== "COMPLETE", true)) // Use inclusive takeWhile.
    .pipe(finalize(() => worker.complete())) // Terminates the worker thread when done with task.
    .subscribe(message => {
      // Log the new ticks property for each message.
      if (message.state === 'WORKING')
        console.log(message.ticks, message.progress);
      if (message.state === 'COLLATING')
        console.log(message.ticks, message.progress, message.amount);
      if (message.state === 'COMPLETE')
        console.log(message.ticks, message.result);
    });

  // Outgoing messages are still sent with the subject. User data will be added by the modifier.
  worker.next({ task: "DO_SOMETHING", data: 1234 });
```

In the worker code it is similar. No parameter to `workerSubject`, and pipe to `workerOperator`:
```typescript
/// <reference lib="webworker" />
import { workerSubject, workerOperator } from '@packageforge/worker-subject';
import { timer } from 'rxjs';
import { tap } from 'rxjs/operators';
import { IMyStateMessage, IMyTaskMessage } from './my-types';

// create a variable to store when task messages are received:
let lastTaskStartTicks:number = 0;

// Create a typed WorkerSubject:
const worker = workerSubject<IMyStateMessage>();

const workerModifier=worker
  .pipe(tap(data=>{
    // Modify all outgoing state messages to add ellapsed ticks.
    data.message.ticks = Date.now() - lastTaskStartTicks;
  }))
  // Attach the globalThis object, also passing the task message type parameter if desired.
  .pipe(workerOperator<IMyTaskMessage>(globalThis))
  .pipe(tap(()=>{
    // Store the time of the incomming message.
    lastTaskStartTicks = Date.now();
  }));

// Subscribe to messages coming from workerModifier.
workerModifier.subscribe(message => {
  // Display user id that was added to every task message.
  console.log("Doing task " + message.task + " for user " + message.userId);
  if (message.task === "DO_SOMETHING")
    doSomething(message.data);
});

async function doSomething(data: number) {
  // Let the main thread know we are starting.
  worker.next({state: "WORKING", progress: 0});
  // Do something intensive.
  await timer(500).toPromise();
  // Let the main thread know we are half way done.
  worker.next({state: "WORKING", progress: 0.5});
  // Do something intensive.
  await timer(250).toPromise();
  // Let the main thread know we are finishing up.
  worker.next({state: "COLLATING", progress: 0.75, amount: 110});
  // Collate that data.
  await timer(250).toPromise();
  // Task complete, send the results.
  worker.next({state: "COMPLETE", result: 110*data});
}
```

Output shows both the user id and the ticks:
```
Doing task DO_SOMETHING for user ABC_USER_ID
1 0
502 0.5
753 0.75 110
1003 135740
```
## Lazy loading workers.

#### 5: Lazy loading

If `workerSubject` or `workerOperator` is invoked with a `Worker` as a parameter, that worker thread is started immediately. To start the worker only when needed, instead pass a function that returns a `Worker`. This function will not get called until either the `next` or `subscribe` method is first called, delaying the creation of the worker until it is needed.

Examples:
```typescript
import { workerSubject } from '@packageforge/worker-subject';

  // Create a WorkerSubject:
  const worker = workerSubject(() => new Worker('./test1.worker', { type: 'module', name: 'test1' }));

  // Note that the worker thread is not started as neither next nor subscribe is called.
```
