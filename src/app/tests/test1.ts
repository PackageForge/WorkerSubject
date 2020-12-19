import { workerSubject } from 'projects/worker-subject/src/public-api';

export function test1() {

  // Create a WorkerSubject:
  const worker = workerSubject(new Worker('./test1.worker', { type: 'module', name: 'test1' }));

  // Subscribe to messages coming from the worker thread.
  worker.subscribe((message: any) => console.log(JSON.stringify(message)));

  // Send messages to the worker thread with the next method:
  worker.next({ task: "DO_SOMETHING", data: 1234 });

}
