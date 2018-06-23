export let CurrentObserver = null
const PendingCells = new Set();
let Timer = 0;

export class Cell {
  reactions = new Set();
  dependencies = new Set();
  tempSet = new Set();
  value;
  fn;
  active;
  state;
  constructor(value, fn = null, active = false) {
    this.value = value;
    this.fn = fn;
    this.active = active;
    this.state = fn ? "init" : "actual";
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
        reaction.state = "dirty";
        reaction.markAsCheck();
      }
    }
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
        dep.actualize();
        if (this.state === "dirty") {
          this.run();
          break;
        }
      }
    } else if (this.state === "dirty" || this.state === "init") {
      this.run();
    }
    this.state = "actual";
  }
  run() {
    if (!this.fn) return;
    const currentObserver = CurrentObserver;
    CurrentObserver = this;
    const oldDependencies = this.dependencies;
    this.dependencies = this.tempSet;
    const newValue = this.fn();
    CurrentObserver = currentObserver;
    for (const dep of oldDependencies) {
      if (!this.dependencies.has(dep)) {
        dep.reactions.delete(this);
        if (dep.reactions.size === 0) dep.unsubscribe();
      }
    }
    this.tempSet = oldDependencies;
    this.tempSet.clear();
    this.set(newValue);
  }
  unsubscribe() {
    for (const dep of this.dependencies) {
      dep.reactions.delete(this);
      if (dep.reactions.size === 0) dep.unsubscribe();
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