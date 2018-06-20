let CurrentObserver = null
const PendingCells = [];
let Timer = null;

export class Cell {
  reactions = new Set();
  dependencies = new Set();
  value;
  fn;
  reactionFn;
  active;
  state;
  runned = false;
  constructor(value, fn = null, reactionFn = null, active = false) {
    this.value = value;
    this.fn = fn;
    this.reactionFn = reactionFn;
    this.active = active;
    this.state = fn ? "dirty" : "actual";
  }

  get() {
    if (this.state !== "actual") this.actualize();
    if (CurrentObserver) {
      this.reactions.add(CurrentObserver);
      CurrentObserver.dependencies.add(this);
    }
    return this.value;
  }
  set(newValue) {
    if (newValue !== this.value) {
      this.value = newValue;
      for (const reaction of this.reactions) {
        reaction.mark(true);
      }
      return true;
    } else {
      return false;
    }
  }
  mark(dirty = false) {
    this.state = dirty ? "dirty" : "check";
    for (const reaction of this.reactions) {
      if(reaction.state === "actual") reaction.mark();
    }
    if (this.active){
      PendingCells.push(this);
      if (!Timer) Timer = Promise.resolve().then(runPendingCells);
    }
  }
  actualize() {
    if (this.state === "check") {
      for (const dep of this.dependencies) {
        if(this.state === "dirty") break;
        dep.actualize();
      }
      if(this.state === "dirty"){
        this.run();
      } else {
        this.state = "actual"
      }
    } else if(this.state === "dirty"){
      this.run();
    } 
  }
  run() {
    if (!this.fn) return;
    const currentObserver = CurrentObserver;
    CurrentObserver = this;
    const oldDependencies = this.dependencies;
    this.dependencies = new Set();
    const newValue = this.fn();
    CurrentObserver = currentObserver;
    for (const dep of oldDependencies) {
      if (!this.dependencies.has(dep)) {
        dep.reactions.delete(this);
        if(dep.reactions.size === 0) dep.unsubscribe();
      }
    }
    const changed = this.set(newValue);
    this.state = "actual";
    if (changed && this.reactionFn) {
      const currentObserver = CurrentObserver;
      CurrentObserver = null;
      this.reactionFn(!this.runned);
      if(!this.runned) this.runned = true;
      CurrentObserver = currentObserver;
    }
  }
  unsubscribe() {
    for (const dep of this.dependencies) {
      dep.reactions.delete(this);
      if(dep.reactions.size === 0) dep.unsubscribe();
    }
    this.state = "dirty";
  }
}

export function runPendingCells() {
  for (const cell of PendingCells) {
    cell.actualize();
  }
  Timer = null;
}