export let CurrentObserver = null
const PendingCells = new Set();
let Timer = 0;

export class Cell {
  reactions = new Set();
  value;
  constructor(value) {
    this.value = value;
  }
  get() {
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
        reaction.state = "dirty";
        reaction.markAsCheck();
      }
    }
  }
}

export class ComputedCell extends Cell {
  dependencies = new Set();
  tempSet = new Set();
  fn;
  active;
  state;
  constructor(value, fn = null, active = false) {
    super(value);
    this.fn = fn;
    this.active = active;
    this.state = "init";
  }
  get() {
    if (this.state !== "actual") this.actualize();
    return super.get();
  }
  markAsCheck() {
    if (this.active) {
      PendingCells.add(this);
      if (Timer === 0) Timer = setTimeout(runPendingCells);
    }
    for (const reaction of this.reactions) {
      if (reaction.state === "actual") {
        reaction.state = "check";
        reaction.markAsCheck();
      }
    }
  }
  actualize() {
    if (this.state === "check") {
      for (const dep of this.dependencies) {
        if (dep instanceof ComputedCell) {
          dep.actualize();
          if (this.state === "dirty") {
            this.run();
            break;
          }
        }
      }
    } else if (this.state === "dirty" || this.state === "init") {
      this.run();
    }
    this.state = "actual";
  }
  run() {
    const oldDependencies = this.dependencies;
    this.dependencies = this.tempSet;
    this.tempSet = oldDependencies;

    const currentObserver = CurrentObserver;
    CurrentObserver = this;
    this.set(this.fn());
    CurrentObserver = currentObserver;

    for (const dep of this.tempSet) {
      if (!this.dependencies.has(dep)) {
        dep.reactions.delete(this);
        if (dep instanceof ComputedCell && dep.reactions.size === 0) dep.unsubscribe();
      }
    }
    this.tempSet.clear();
  }
  unsubscribe() {
    for (const dep of this.dependencies) {
      dep.reactions.delete(this);
      if (dep instanceof ComputedCell && dep.reactions.size === 0) dep.unsubscribe();
    }
    this.dependencies.clear();
    this.state = "init";
  }
}

export function runPendingCells() {
  for (const cell of PendingCells) {
    if (cell.state !== "init") cell.actualize();
  }
  PendingCells.clear();
  if (Timer !== 0) {
    clearTimeout(Timer);
    Timer = 0;
  }
}