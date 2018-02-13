let CurrentObserver: Cell<any> | null = null
const PendingCells: Array<Cell<any>> = [];
let Timer: Promise<void> | null = null;

export class Cell<T> {
  reactions: Set<Cell<any>> = new Set();
  dependencies: Set<Cell<any>> = new Set();
  state: "dirty" | "check" | "actual";
  runned: boolean = false;
  constructor(
    public value: T,
    public fn: (() => T) | null = null,
    public reactionFn: ((initial: boolean) => void) | null = null,
    public active: boolean = false,
  ) { 
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
  set(newValue: T) {
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
        dep.actualize();
      }
      if((this.state as "check" | "dirty") === "dirty"){
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