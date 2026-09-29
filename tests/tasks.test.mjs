import {test} from 'node:test';
import assert from 'node:assert/strict';
import {taskInput, blankTask, inView} from '../lib/tasks.ts';
test('rejects blank titles, invalid calendar dates and excessive subtasks',()=>{
  assert.equal(taskInput.safeParse({...blankTask(), title:'  '}).success,false);
  assert.equal(taskInput.safeParse({...blankTask(), title:'Plan',due:'2026-02-30'}).success,false);
  assert.equal(taskInput.safeParse({...blankTask(), title:'Plan',priority:'urgent'}).success,false);
  assert.equal(taskInput.safeParse({...blankTask(),title:'Plan',subtasks:Array(31).fill({id:crypto.randomUUID(),title:'Step',done:false})}).success,false);
});
test('trims title and strips client-supplied ownership fields',()=>{
  const task=taskInput.parse({title:'  Plan the launch  ',userId:'another-user',id:'injected'});
  assert.equal(task.title,'Plan the launch');assert.equal('userId' in task,false);assert.equal('id' in task,false);
});
test('my day includes overdue unfinished tasks but excludes old completed tasks',()=>{
  const task={...blankTask(),title:'Plan',due:'2026-09-28'};
  assert.equal(inView(task,'My day','2026-09-29'),true);
  assert.equal(inView({...task,status:'done'},'My day','2026-09-29'),false);
  assert.equal(inView({...task,due:'2026-09-29',status:'done'},'My day','2026-09-29'),true);
});
test('upcoming excludes completed and undated tasks',()=>{
  assert.equal(inView({...blankTask(),due:'2026-10-01'},'Upcoming','2026-09-29'),true);
  assert.equal(inView({...blankTask(),due:'2026-10-01',status:'done'},'Upcoming','2026-09-29'),false);
  assert.equal(inView(blankTask(),'Upcoming','2026-09-29'),false);
});
