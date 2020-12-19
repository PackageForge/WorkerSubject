/// <reference lib="webworker" />
import { workerOperator, workerSubject } from 'projects/worker-subject/src/public-api';
import { timer } from 'rxjs';
import { tap } from 'rxjs/operators';
import { IMyStateMessage, IMyTaskMessage } from './test4-types';
console.log("test4 worker starting");

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
