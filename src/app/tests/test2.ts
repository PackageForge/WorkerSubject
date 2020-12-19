import { workerSubject } from 'projects/worker-subject/src/public-api';
import { finalize, takeWhile } from 'rxjs/operators';

export function test2() {

  // Create a WorkerSubject:
  const worker = workerSubject(new Worker('./test1.worker', { type: 'module', name: "test1" }));

  // Subscribe to messages coming from the worker thread.
  worker
    .pipe(takeWhile((message: any) => message.state !== "COMPLETE", true)) // Use inclusive takeWhile.
    .pipe(finalize(() => worker.complete())) // Terminates the worker thread when done with task.
    .subscribe(message => console.log(JSON.stringify(message)));

  // Send messages to the worker thread with the next method:
  worker.next({ task: "DO_SOMETHING", data: 1234 });

}
